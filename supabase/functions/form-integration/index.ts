import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Sanitize text to prevent stored XSS
function sanitizeText(text: string): string {
  return text
    .replace(/[<>"']/g, "")
    .replace(/\r?\n/g, " ")
    .trim();
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Validate phone format
function isValidPhone(phone: string): boolean {
  return /^[+0-9\s().-]*$/.test(phone) && phone.length <= 30;
}

// Validate name (letters, spaces, hyphens, apostrophes, unicode)
function isValidName(name: string): boolean {
  return /^[\p{L}\s'.-]+$/u.test(name) && name.length >= 1 && name.length <= 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { entity_type = "contact", data } = body;

    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'data' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Honeypot: if bot-targeted fields are filled, silently succeed
    if (data.website || data.url || data.honeypot) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use environment variables for Supabase connection
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (entity_type === "contact") {
      const { first_name, last_name, email, phone, source, title } = data;

      // Validate first_name
      if (!first_name || typeof first_name !== "string" || !isValidName(first_name)) {
        return new Response(
          JSON.stringify({ error: "Valid first_name is required (letters, spaces, hyphens only, max 100 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate optional email
      if (email && (typeof email !== "string" || !isValidEmail(email))) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate optional phone
      if (phone && (typeof phone !== "string" || !isValidPhone(phone))) {
        return new Response(
          JSON.stringify({ error: "Invalid phone format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: inserted, error } = await serviceClient
        .from("contacts")
        .insert({
          first_name: sanitizeText(first_name).slice(0, 100),
          last_name: sanitizeText(String(last_name || "")).slice(0, 100),
          email: email ? String(email).toLowerCase().trim().slice(0, 255) : null,
          phone: phone ? sanitizeText(String(phone)).slice(0, 30) : null,
          source: sanitizeText(String(source || "web_form")).slice(0, 50),
          title: title ? sanitizeText(String(title)).slice(0, 100) : null,
          owner_id: null, // Never accept owner_id from external input
          status: "prospect",
        })
        .select()
        .single();

      if (error) {
        console.error("Contact insert error:", error.message);
        return new Response(
          JSON.stringify({ error: "Failed to process submission" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id: inserted.id }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (entity_type === "client") {
      const { name, email, phone, company, notes } = data;

      // Validate name
      if (!name || typeof name !== "string" || !isValidName(name)) {
        return new Response(
          JSON.stringify({ error: "Valid name is required (letters, spaces, hyphens only, max 100 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate optional email
      if (email && (typeof email !== "string" || !isValidEmail(email))) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate optional phone
      if (phone && (typeof phone !== "string" || !isValidPhone(phone))) {
        return new Response(
          JSON.stringify({ error: "Invalid phone format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get admin user to assign as owner for external submissions
      const { data: adminUsers } = await serviceClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      const assigneeId = adminUsers?.[0]?.user_id;
      if (!assigneeId) {
        console.error("No admin user found to assign external client");
        return new Response(
          JSON.stringify({ error: "Failed to process submission" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: inserted, error } = await serviceClient
        .from("clients")
        .insert({
          name: sanitizeText(name).slice(0, 100),
          email: email ? String(email).toLowerCase().trim().slice(0, 255) : null,
          phone: phone ? sanitizeText(String(phone)).slice(0, 30) : null,
          company: company ? sanitizeText(String(company)).slice(0, 100) : null,
          notes: `[External submission] ${notes ? sanitizeText(String(notes)).slice(0, 2000) : ""}`.trim(),
          user_id: assigneeId,
          status: "lead",
        })
        .select()
        .single();

      if (error) {
        console.error("Client insert error:", error.message);
        return new Response(
          JSON.stringify({ error: "Failed to process submission" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id: inserted.id }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Form integration error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process submission" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
