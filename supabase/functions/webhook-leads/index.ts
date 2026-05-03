import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function sanitize(text: string, maxLen = 500): string {
  return text.replace(/[<>"']/g, '').replace(/\r?\n/g, ' ').trim().slice(0, maxLen)
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 255
}

const ALLOWED_KEYS = new Set(['name', 'email', 'phone', 'title', 'company', 'message', 'source', 'external_id'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    // Validate API key
    const authHeader = req.headers.get('authorization') || ''
    const apiKey = authHeader.replace(/^Bearer\s+/i, '')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify API key
    const { data: keyRecord, error: keyError } = await supabase
      .from('webhook_api_keys')
      .select('id, is_active')
      .eq('api_key', apiKey)
      .single()

    if (keyError || !keyRecord || !keyRecord.is_active) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Update last_used_at
    await supabase.from('webhook_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)

    const body = await req.json()

    // Reject unexpected fields
    for (const key of Object.keys(body)) {
      if (!ALLOWED_KEYS.has(key)) {
        return new Response(JSON.stringify({ error: `Unexpected field: ${key}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Validate required
    if (!body.name || !body.email) {
      return new Response(JSON.stringify({ error: 'name and email are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!isValidEmail(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get admin to assign
    const { data: adminUsers } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
    const assigneeId = adminUsers?.[0]?.user_id
    if (!assigneeId) {
      return new Response(JSON.stringify({ error: 'No admin available' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if lead with same email exists (for upsert)
    const { data: existingLead } = await supabase
      .from('clients')
      .select('id')
      .eq('email', body.email.toLowerCase().trim())
      .is('deleted_at', null)
      .limit(1)

    let leadId: string
    let eventType: string

    if (existingLead && existingLead.length > 0) {
      // Update existing lead
      leadId = existingLead[0].id
      eventType = 'lead.updated'
      await supabase.from('clients').update({
        name: sanitize(body.name, 100),
        phone: body.phone ? sanitize(body.phone, 30) : undefined,
        company: body.company ? sanitize(body.company, 100) : undefined,
        notes: body.message ? `[Webhook update] ${sanitize(body.message, 2000)}` : undefined,
      }).eq('id', leadId)
    } else {
      // Create new lead — must have account + primary contact (relational schema)
      eventType = 'lead.created'

      // 1. Account
      const { data: account, error: accErr } = await supabase.from('accounts').insert({
        name: body.company ? sanitize(body.company, 100) : sanitize(body.name, 100),
        owner_id: assigneeId,
        phone: body.phone ? sanitize(body.phone, 30) : '',
      }).select('id').single()
      if (accErr || !account) {
        console.error('Account insert error:', accErr?.message)
        return new Response(JSON.stringify({ error: 'Failed to create account' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 2. Contact
      const nameParts = sanitize(body.name, 100).trim().split(/\s+/)
      const { data: contact, error: ctErr } = await supabase.from('contacts').insert({
        first_name: nameParts[0] || 'Unnamed',
        last_name: nameParts.slice(1).join(' '),
        email: body.email.toLowerCase().trim().slice(0, 255),
        phone: body.phone ? sanitize(body.phone, 30) : '',
        account_id: account.id,
        owner_id: assigneeId,
        status: 'prospect',
        source: body.source || 'webhook',
      }).select('id').single()
      if (ctErr || !contact) {
        console.error('Contact insert error:', ctErr?.message)
        return new Response(JSON.stringify({ error: 'Failed to create contact' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 3. Lead
      const { data: lead, error: leadError } = await supabase.from('clients').insert({
        name: sanitize(body.name, 100),
        email: body.email.toLowerCase().trim().slice(0, 255),
        phone: body.phone ? sanitize(body.phone, 30) : null,
        company: body.company ? sanitize(body.company, 100) : null,
        notes: body.message ? `[Webhook] ${sanitize(body.message, 2000)}` : '[Webhook submission]',
        user_id: assigneeId,
        status: 'lead',
        account_id: account.id,
        primary_contact_id: contact.id,
      }).select().single()

      if (leadError) {
        console.error('Lead insert error:', leadError.message)
        return new Response(JSON.stringify({ error: 'Failed to create lead' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      leadId = lead.id

      // Create task for new leads
      await supabase.from('tasks').insert({
        title: `Follow up webhook lead: ${body.name}`,
        description: `New lead via webhook from source: ${body.source || 'api'}`,
        assigned_to: assigneeId,
        created_by: assigneeId,
        priority: 'high',
        status: 'todo',
        related_entity_type: 'client',
        related_entity_id: leadId,
      })

      // Enroll in automation sequences
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
            entity_id: leadId,
            enrolled_by: assigneeId,
          })
        }
      }
    }

    // Emit domain event
    await supabase.from('domain_events').insert({
      event_type: eventType,
      entity_type: 'client',
      entity_id: leadId,
      actor_type: 'system',
      payload: { source: body.source || 'webhook', external_id: body.external_id || null },
    })

    return new Response(
      JSON.stringify({ success: true, id: leadId, action: eventType === 'lead.created' ? 'created' : 'updated' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Webhook leads error:', err)
    return new Response(JSON.stringify({ error: 'Failed to process' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
