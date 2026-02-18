import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// In-memory rate limiting per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

function sanitize(text: string, maxLen = 500): string {
  return text.replace(/[<>"']/g, '').replace(/\r?\n/g, ' ').trim().slice(0, maxLen)
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 255
}

const ALLOWED_FIELDS = new Set(['name', 'email', 'phone', 'title', 'company', 'message', 'form_id', 'source', 'page_url', 'campaign', 'website'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Support both JSON and form-urlencoded
    let body: Record<string, string> = {}
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      const params = new URLSearchParams(text)
      params.forEach((value, key) => { body[key] = value })
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Honeypot check
    if (body.website) {
      // Bot detected, silently accept
      return new Response(JSON.stringify({ success: true }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Reject unexpected fields
    for (const key of Object.keys(body)) {
      if (!ALLOWED_FIELDS.has(key)) {
        return new Response(JSON.stringify({ error: `Unexpected field: ${key}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const formId = body.form_id
    if (!formId) {
      return new Response(JSON.stringify({ error: 'form_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Validate form exists and is active
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*, form_fields(*)')
      .eq('id', formId)
      .single()

    if (formError || !form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!form.is_active) {
      return new Response(JSON.stringify({ error: 'Form is not active' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Validate required fields
    const fields = (form.form_fields || []) as Array<{ field_key: string; is_required: boolean }>
    for (const field of fields) {
      if (field.is_required && !body[field.field_key]?.trim()) {
        return new Response(JSON.stringify({ error: `${field.field_key} is required` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Validate email if present
    if (body.email && !isValidEmail(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get admin to assign lead
    const { data: adminUsers } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
    const assigneeId = adminUsers?.[0]?.user_id
    if (!assigneeId) {
      console.error('No admin user found')
      return new Response(JSON.stringify({ error: 'Failed to process' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create lead (client with status=lead)
    const { data: lead, error: leadError } = await supabase.from('clients').insert({
      name: sanitize(body.name || 'Unknown', 100),
      email: body.email ? body.email.toLowerCase().trim().slice(0, 255) : null,
      phone: body.phone ? sanitize(body.phone, 30) : null,
      company: body.company ? sanitize(body.company, 100) : null,
      notes: body.message ? `[Form: ${form.name}] ${sanitize(body.message, 2000)}` : `[Form: ${form.name}]`,
      user_id: assigneeId,
      status: 'lead',
    }).select().single()

    if (leadError) {
      console.error('Lead insert error:', leadError.message)
      return new Response(JSON.stringify({ error: 'Failed to process submission' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Track submission
    await supabase.from('form_submissions').insert({
      form_id: formId,
      lead_id: lead.id,
      source: sanitize(body.source || 'embed', 50),
      page_url: sanitize(body.page_url || '', 500),
      ip_hash: ip.slice(0, 15), // truncated for privacy
    })

    // Emit domain event
    await supabase.from('domain_events').insert({
      event_type: 'lead.created',
      entity_type: 'client',
      entity_id: lead.id,
      actor_type: 'system',
      payload: { form_id: formId, source: body.source || 'embed', form_name: form.name },
    })

    // Create initial follow-up task
    await supabase.from('tasks').insert({
      title: `Follow up new lead: ${lead.name}`,
      description: `New lead submitted via form "${form.name}". Contact them promptly.`,
      assigned_to: assigneeId,
      created_by: assigneeId,
      priority: 'high',
      status: 'todo',
      related_entity_type: 'client',
      related_entity_id: lead.id,
    })

    // Auto-enroll in follow-up sequences matching lead.created trigger
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'record_created')
      .eq('entity_type', 'client')
      .is('deleted_at', null)

    for (const rule of rules || []) {
      const actionConfig = rule.action_config as any
      if (actionConfig?.sequence_id) {
        await supabase.from('follow_up_sequence_enrollments').insert({
          sequence_id: actionConfig.sequence_id,
          entity_type: 'client',
          entity_id: lead.id,
          enrolled_by: assigneeId,
        })
      }
    }

    // For HTML form submissions, redirect back or show success
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const redirectUrl = body.page_url || '/'
      return new Response(
        `<html><body><p>Thank you! Your submission has been received.</p><script>setTimeout(function(){history.back()},3000)</script></body></html>`,
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    return new Response(JSON.stringify({ success: true, id: lead.id }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Form submit error:', err)
    return new Response(JSON.stringify({ error: 'Failed to process submission' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
