import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

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
    const fields = (form.form_fields || []) as Array<{
      field_key: string
      is_required: boolean
      target_entity: string
      target_field: string
    }>

    for (const field of fields) {
      if (field.is_required && !body[field.field_key]?.trim()) {
        return new Response(JSON.stringify({ error: `${field.field_key} is required` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Validate email if present
    if (body.email && !isValidEmail(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get admin to assign
    const { data: adminUsers } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
    const assigneeId = adminUsers?.[0]?.user_id
    if (!assigneeId) {
      console.error('No admin user found')
      return new Response(JSON.stringify({ error: 'Failed to process' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ BUILD ENTITY DATA FROM FIELD MAPPINGS ═══
    // Group fields by target entity
    const entityData: Record<string, Record<string, string>> = {}
    for (const field of fields) {
      const val = body[field.field_key]
      if (!val) continue
      const entity = field.target_entity || 'client'
      const targetField = field.target_field || field.field_key
      if (!entityData[entity]) entityData[entity] = {}
      entityData[entity][targetField] = sanitize(val, targetField === 'notes' ? 2000 : 255)
    }

    const createdIds: Record<string, string> = {}
    let primaryLeadId: string | null = null

    // ═══ CREATE ACCOUNT if mapped ═══
    if (entityData.account && Object.keys(entityData.account).length > 0) {
      const accountPayload: Record<string, any> = {
        owner_id: assigneeId,
        name: entityData.account.name || body.company || 'Unknown Company',
        ...entityData.account,
      }
      const { data: account, error: accErr } = await supabase
        .from('accounts')
        .insert(accountPayload)
        .select()
        .single()
      if (accErr) {
        console.error('Account insert error:', accErr.message)
      } else {
        createdIds.account = account.id
      }
    }

    // ═══ CREATE CONTACT if mapped ═══
    if (entityData.contact && Object.keys(entityData.contact).length > 0) {
      const contactPayload: Record<string, any> = {
        owner_id: assigneeId,
        status: 'prospect',
        first_name: entityData.contact.first_name || body.name?.split(' ')[0] || 'Unknown',
        ...entityData.contact,
      }
      // Link to account if created
      if (createdIds.account) {
        contactPayload.account_id = createdIds.account
      }
      // If first_name came from 'name' field and there's no explicit last_name, split it
      if (!contactPayload.last_name && body.name) {
        const parts = body.name.trim().split(/\s+/)
        if (parts.length > 1) {
          contactPayload.first_name = sanitize(parts[0], 100)
          contactPayload.last_name = sanitize(parts.slice(1).join(' '), 100)
        }
      }
      const { data: contact, error: contErr } = await supabase
        .from('contacts')
        .insert(contactPayload)
        .select()
        .single()
      if (contErr) {
        console.error('Contact insert error:', contErr.message)
      } else {
        createdIds.contact = contact.id
      }
    }

    // ═══ ENSURE ACCOUNT + CONTACT exist (relational requirement) ═══
    if (!createdIds.account) {
      const { data: account, error: accErr } = await supabase
        .from('accounts')
        .insert({
          owner_id: assigneeId,
          name: body.company ? sanitize(body.company, 100) : sanitize(body.name || 'Unknown', 100),
          phone: body.phone ? sanitize(body.phone, 30) : '',
        })
        .select('id')
        .single()
      if (accErr || !account) {
        console.error('Fallback account insert error:', accErr?.message)
        return new Response(JSON.stringify({ error: 'Failed to create account' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      createdIds.account = account.id
    }

    if (!createdIds.contact) {
      const nameParts = (body.name || 'Unknown').trim().split(/\s+/)
      const { data: contact, error: contErr } = await supabase
        .from('contacts')
        .insert({
          owner_id: assigneeId,
          status: 'prospect',
          first_name: nameParts[0] || 'Unknown',
          last_name: nameParts.slice(1).join(' '),
          email: body.email ? body.email.toLowerCase().trim() : '',
          phone: body.phone ? sanitize(body.phone, 30) : '',
          account_id: createdIds.account,
        })
        .select('id')
        .single()
      if (contErr || !contact) {
        console.error('Fallback contact insert error:', contErr?.message)
        return new Response(JSON.stringify({ error: 'Failed to create contact' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      createdIds.contact = contact.id
    }

    // ═══ CREATE LEAD ═══
    const clientPayload: Record<string, any> = {
      user_id: assigneeId,
      status: 'lead',
      name: body.name || 'Unknown',
      email: body.email ? body.email.toLowerCase().trim() : null,
      phone: body.phone ? sanitize(body.phone, 30) : null,
      company: body.company ? sanitize(body.company, 100) : null,
      account_id: createdIds.account,
      primary_contact_id: createdIds.contact,
    }

    if (entityData.client) {
      Object.assign(clientPayload, entityData.client)
      if (!clientPayload.name || clientPayload.name === '') {
        clientPayload.name = body.name || 'Unknown'
      }
      // never let mapping overwrite required FKs
      clientPayload.account_id = createdIds.account
      clientPayload.primary_contact_id = createdIds.contact
    }

    const existingNotes = clientPayload.notes || ''
    clientPayload.notes = `[Form: ${form.name}] ${existingNotes}`.trim()

    const { data: lead, error: leadError } = await supabase
      .from('clients')
      .insert(clientPayload)
      .select()
      .single()

    if (leadError) {
      console.error('Lead insert error:', leadError.message)
      return new Response(JSON.stringify({ error: 'Failed to process submission' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    primaryLeadId = lead.id
    createdIds.client = lead.id

    // ═══ TRACK SUBMISSION ═══
    await supabase.from('form_submissions').insert({
      form_id: formId,
      lead_id: lead.id,
      source: sanitize(body.source || 'embed', 50),
      page_url: sanitize(body.page_url || '', 500),
      ip_hash: ip.slice(0, 15),
    })

    // ═══ DOMAIN EVENT ═══
    await supabase.from('domain_events').insert({
      event_type: 'lead.created',
      entity_type: 'client',
      entity_id: lead.id,
      actor_type: 'system',
      payload: {
        form_id: formId,
        source: body.source || 'embed',
        form_name: form.name,
        entities_created: Object.keys(createdIds),
      },
    })

    // ═══ CREATE FOLLOW-UP TASK ═══
    const entitiesSummary = Object.keys(createdIds).join(', ')
    await supabase.from('tasks').insert({
      title: `Follow up new lead: ${lead.name}`,
      description: `New lead via form "${form.name}". Created: ${entitiesSummary}. Contact them promptly.`,
      assigned_to: assigneeId,
      created_by: assigneeId,
      priority: 'high',
      status: 'todo',
      related_entity_type: 'client',
      related_entity_id: lead.id,
    })

    // ═══ AUTO-ENROLL IN SEQUENCES ═══
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

    // For HTML form submissions, redirect back
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return new Response(
        `<html><body><p>Thank you! Your submission has been received.</p><script>setTimeout(function(){history.back()},3000)</script></body></html>`,
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, created: createdIds }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Form submit error:', err)
    return new Response(JSON.stringify({ error: 'Failed to process submission' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
