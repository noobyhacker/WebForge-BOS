import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      "https://seknlowndpotkkrdcwvj.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNla25sb3duZHBvdGtrcmRjd3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjAwNTcsImV4cCI6MjA4NjAzNjA1N30.Rp87sSBCMQnn5bQ16g77xDnkekoVzzZKkUawnT1vFkE"
    );

    const body = await req.json();
    const { entity_type = "contact", data } = body;

    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'data' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (entity_type === "contact") {
      const { first_name, last_name, email, phone, source, title } = data;
      if (!first_name) {
        return new Response(
          JSON.stringify({ error: "first_name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use service role for inserts from external forms
      const serviceClient = createClient(
        "https://seknlowndpotkkrdcwvj.supabase.co",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: inserted, error } = await serviceClient
        .from("contacts")
        .insert({
          first_name,
          last_name: last_name || "",
          email: email || null,
          phone: phone || null,
          source: source || "web_form",
          title: title || null,
          owner_id: data.owner_id || "00000000-0000-0000-0000-000000000000",
          status: "prospect",
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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
      if (!name) {
        return new Response(
          JSON.stringify({ error: "name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const serviceClient = createClient(
        "https://seknlowndpotkkrdcwvj.supabase.co",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: inserted, error } = await serviceClient
        .from("clients")
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          notes: notes || null,
          user_id: data.owner_id || "00000000-0000-0000-0000-000000000000",
          status: "lead",
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, id: inserted.id }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported entity_type: ${entity_type}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
