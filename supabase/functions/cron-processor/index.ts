import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results = { enrollments: 0, slaBreaches: 0, slaResolved: 0, events: 0, tasksCancelled: 0 }

  try {
    // ═══ JOB A: Process Follow-Up Enrollments ═══
    const { data: enrollments } = await supabase
      .from('follow_up_sequence_enrollments')
      .select('*, follow_up_sequences!inner(id, name, deleted_at), follow_up_sequence_steps(*)')
      .eq('status', 'active')
      .is('follow_up_sequences.deleted_at', null)

    for (const enrollment of enrollments || []) {
      const steps = (enrollment.follow_up_sequence_steps || [])
        .sort((a: any, b: any) => a.step_order - b.step_order)

      if (enrollment.current_step_index >= steps.length) {
        await supabase.from('follow_up_sequence_enrollments').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', enrollment.id)
        continue
      }

      const step = steps[enrollment.current_step_index]
      const delayMs = (step.delay_minutes || step.delay_days * 1440) * 60 * 1000
      const baseTime = enrollment.last_step_executed_at || enrollment.enrolled_at
      const dueAt = new Date(new Date(baseTime).getTime() + delayMs)

      if (new Date() < dueAt) continue // Not due yet

      // Check cancellation: entity soft-deleted?
      let cancelled = false
      if (enrollment.entity_type === 'client') {
        const { data: entity } = await supabase.from('clients').select('deleted_at, status').eq('id', enrollment.entity_id).single()
        if (entity?.deleted_at || (entity?.status && entity.status !== 'lead')) cancelled = true
      } else if (enrollment.entity_type === 'deal') {
        const { data: entity } = await supabase.from('deals').select('deleted_at, stage').eq('id', enrollment.entity_id).single()
        if (entity?.deleted_at || entity?.stage === 'closed_won' || entity?.stage === 'closed_lost') cancelled = true
      } else if (enrollment.entity_type === 'quote') {
        const { data: entity } = await supabase.from('quotes').select('deleted_at, status').eq('id', enrollment.entity_id).single()
        if (entity?.deleted_at || entity?.status === 'accepted' || entity?.status === 'rejected') cancelled = true
      } else if (enrollment.entity_type === 'invoice') {
        const { data: entity } = await supabase.from('invoices').select('deleted_at, status').eq('id', enrollment.entity_id).single()
        if (entity?.deleted_at || entity?.status === 'paid') cancelled = true
      }

      if (cancelled) {
        await supabase.from('follow_up_sequence_enrollments').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }).eq('id', enrollment.id)
        continue
      }

      // Execute step action
      const actionType = step.type || 'notification'
      if (actionType === 'notification') {
        // Find entity owner
        let ownerId = enrollment.enrolled_by
        if (enrollment.entity_type === 'client') {
          const { data } = await supabase.from('clients').select('user_id').eq('id', enrollment.entity_id).single()
          ownerId = data?.user_id || ownerId
        } else if (enrollment.entity_type === 'deal') {
          const { data } = await supabase.from('deals').select('owner_id').eq('id', enrollment.entity_id).single()
          ownerId = data?.owner_id || ownerId
        }

        if (ownerId) {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            title: `Follow-up: ${enrollment.follow_up_sequences.name}`,
            message: step.content || step.subject || `Step ${enrollment.current_step_index + 1} of sequence`,
            type: 'automation',
            entity_type: enrollment.entity_type,
            entity_id: enrollment.entity_id,
          })
        }
      } else if (actionType === 'task' || actionType === 'email') {
        let ownerId = enrollment.enrolled_by
        if (enrollment.entity_type === 'deal') {
          const { data } = await supabase.from('deals').select('owner_id').eq('id', enrollment.entity_id).single()
          ownerId = data?.owner_id || ownerId
        } else if (enrollment.entity_type === 'client') {
          const { data } = await supabase.from('clients').select('user_id').eq('id', enrollment.entity_id).single()
          ownerId = data?.user_id || ownerId
        }

        if (ownerId) {
          await supabase.from('activities').insert({
            owner_id: ownerId,
            type: actionType === 'email' ? 'email' : 'task',
            subject: step.subject || `Follow-up: ${enrollment.follow_up_sequences.name}`,
            description: step.content || '',
            entity_type: enrollment.entity_type,
            entity_id: enrollment.entity_id,
            status: 'pending',
            due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          })
        }
      }

      // Advance step
      const nextIndex = enrollment.current_step_index + 1
      await supabase.from('follow_up_sequence_enrollments').update({
        current_step_index: nextIndex,
        last_step_executed_at: new Date().toISOString(),
        ...(nextIndex >= steps.length ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
      }).eq('id', enrollment.id)

      // Emit domain event
      await supabase.from('domain_events').insert({
        event_type: 'automation.executed',
        entity_type: enrollment.entity_type,
        entity_id: enrollment.entity_id,
        actor_id: enrollment.enrolled_by,
        actor_type: 'system',
        payload: { sequence_id: enrollment.sequence_id, step_index: enrollment.current_step_index, action_type: actionType },
      })

      results.enrollments++
    }

    // ═══ JOB B: SLA Breach Detection ═══
    const { data: slaConfigs } = await supabase
      .from('sla_configs')
      .select('*')
      .eq('is_active', true)

    for (const config of slaConfigs || []) {
      if (config.entity_type === 'lead' && config.metric === 'first_response') {
        const thresholdTime = new Date(Date.now() - config.threshold_minutes * 60 * 1000).toISOString()

        // Find leads created before threshold with no activities
        const { data: leads } = await supabase
          .from('clients')
          .select('id, user_id, name, created_at')
          .eq('status', 'lead')
          .is('deleted_at', null)
          .lt('created_at', thresholdTime)

        for (const lead of leads || []) {
          // Check if any activity exists for this lead
          const { count } = await supabase
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', 'client')
            .eq('entity_id', lead.id)

          if ((count || 0) > 0) continue // Has activity, no breach

          // Check if already breached and unresolved
          const { data: existingBreach } = await supabase
            .from('sla_breaches')
            .select('id')
            .eq('entity_id', lead.id)
            .eq('sla_config_id', config.id)
            .is('resolved_at', null)
            .limit(1)

          if (existingBreach && existingBreach.length > 0) continue // Already tracked

          const actualMinutes = (Date.now() - new Date(lead.created_at).getTime()) / 60000

          await supabase.from('sla_breaches').insert({
            sla_config_id: config.id,
            entity_type: 'client',
            entity_id: lead.id,
            owner_id: lead.user_id,
            threshold_minutes: config.threshold_minutes,
            actual_minutes: Math.round(actualMinutes),
          })

          // Notify owner
          await supabase.from('notifications').insert({
            user_id: lead.user_id,
            title: 'SLA Breach: Lead Response',
            message: `Lead "${lead.name}" has not been contacted within ${config.threshold_minutes} minutes.`,
            type: 'sla_breach',
            entity_type: 'client',
            entity_id: lead.id,
          })

          results.slaBreaches++
        }

        // Resolve breaches where activity now exists
        const { data: unresolvedBreaches } = await supabase
          .from('sla_breaches')
          .select('id, entity_id')
          .eq('sla_config_id', config.id)
          .is('resolved_at', null)

        for (const breach of unresolvedBreaches || []) {
          const { count } = await supabase
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', 'client')
            .eq('entity_id', breach.entity_id)

          if ((count || 0) > 0) {
            await supabase.from('sla_breaches').update({
              resolved_at: new Date().toISOString(),
            }).eq('id', breach.id)
            results.slaResolved++
          }
        }
      }
    }

    // ═══ JOB C: Invoice Overdue Domain Events ═══
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, owner_id, invoice_number, due_date')
      .is('deleted_at', null)
      .neq('status', 'paid')
      .lt('due_date', new Date().toISOString().split('T')[0])

    for (const inv of overdueInvoices || []) {
      // Check if we already emitted an overdue event today
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('domain_events')
        .select('id')
        .eq('event_type', 'invoice.overdue')
        .eq('entity_id', inv.id)
        .gte('created_at', today)
        .limit(1)

      if (existing && existing.length > 0) continue

      await supabase.from('domain_events').insert({
        event_type: 'invoice.overdue',
        entity_type: 'invoice',
        entity_id: inv.id,
        actor_type: 'system',
        payload: { invoice_number: inv.invoice_number, due_date: inv.due_date },
      })
      results.events++
    }

    // ═══ JOB D: Auto-Cancel Tasks for Soft-Deleted Entities ═══
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('id, related_entity_type, related_entity_id')
      .is('deleted_at', null)
      .neq('status', 'done')
      .not('related_entity_id', 'is', null)

    for (const task of activeTasks || []) {
      let entityDeleted = false
      const etype = task.related_entity_type
      const eid = task.related_entity_id

      if (!etype || !eid) continue

      const tableMap: Record<string, string> = {
        client: 'clients', deal: 'deals', quote: 'quotes',
        invoice: 'invoices', contact: 'contacts', account: 'accounts',
        lead: 'clients',
      }
      const table = tableMap[etype]
      if (table) {
        const { data: entity } = await supabase.from(table).select('deleted_at').eq('id', eid).single()
        if (entity?.deleted_at) entityDeleted = true
      }

      if (entityDeleted) {
        await supabase.from('tasks').update({
          status: 'done',
          deleted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }).eq('id', task.id)
        results.tasksCancelled++
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Cron processor error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
