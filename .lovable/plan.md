

# BOS Architecture Extensions -- Additive Design Plan

This plan adds nine critical systems to the existing BOS architecture without rewriting anything already in place. Each section defines purpose, schema, behavior, and integration points.

---

## 1. Job Queue and Background Worker Layer

### Problem
Direct table scanning by cron-triggered Edge Functions becomes slow and opaque at scale. There is no visibility into what is pending, locked, or failed.

### Schema: `job_queue`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| job_type | text | e.g. `automation`, `follow_up`, `sla_check`, `notification` |
| payload | jsonb | Input data for the worker |
| status | text | `pending`, `locked`, `done`, `failed`, `dead` |
| priority | int | Lower = higher priority, default 0 |
| locked_by | text | Worker instance identifier |
| locked_at | timestamptz | When lock was acquired |
| attempts | int | default 0 |
| max_attempts | int | default 3 |
| last_error | text | Most recent error message |
| scheduled_for | timestamptz | default now(), allows delayed jobs |
| created_at | timestamptz | default now() |
| completed_at | timestamptz | nullable |

**Indexes**: `(status, priority, scheduled_for)` for worker polling; `(job_type, status)` for metrics.

**RLS**: No user-facing access. All operations via service role in Edge Functions.

### Job Lifecycle

```text
[Enqueue] --> pending --> locked --> done
                  |          |
                  |          +--> failed (attempts < max)
                  |                  |
                  |                  +--> pending (retry with backoff)
                  |
                  +--> dead (attempts >= max, moved to dead-letter)
```

### Locking Strategy
- Worker Edge Function runs: `SELECT * FROM job_queue WHERE status = 'pending' AND scheduled_for <= now() ORDER BY priority, created_at LIMIT 50 FOR UPDATE SKIP LOCKED`
- Sets `status = 'locked'`, `locked_by = worker_id`, `locked_at = now()`
- Stale lock detection: any job locked for over 5 minutes is reset to `pending` by a cleanup cron

### Retry Policy
- Exponential backoff: `scheduled_for = now() + (2^attempts * 5 minutes)`
- After `max_attempts`, status becomes `dead`

### Dead-Letter Handling
- Dead jobs remain in table with `status = 'dead'`
- Admin notification created automatically
- Admin UI allows: inspect payload, retry manually, or dismiss

### Metrics
- Queue depth: `COUNT(*) WHERE status = 'pending'`
- Failure rate: `COUNT(status='failed') / COUNT(status='done')` over rolling window
- Avg latency: `AVG(completed_at - created_at) WHERE status = 'done'`

### Integration
- Cron dispatches only: `pg_cron` inserts jobs into `job_queue` instead of calling Edge Functions directly
- A single `job-worker` Edge Function polls the queue every minute, processes batches by `job_type`
- Existing automation engine, follow-up scheduler, and SLA monitor become job types rather than standalone cron targets

---

## 2. System-Wide Soft Delete Standard

### Standard Columns
Every soft-deletable table gets:
- `deleted_at` (timestamptz, nullable, default null)
- `deleted_by` (uuid, nullable)

A record is considered active when `deleted_at IS NULL`.

### Applicable Entities
| Entity | Soft Delete | Reason |
|---|---|---|
| clients | Yes | Revenue history preservation |
| contacts | Yes | Relationship audit trail |
| accounts | Yes | FK integrity with deals |
| deals | Yes | Financial reporting |
| products | Yes | Invoice/quote line item integrity |
| quotes | Yes | Financial audit |
| invoices | Yes | Legal/financial requirement |
| automation_rules | Yes | Execution log references |
| follow_up_sequences | Yes | Enrollment references |
| pipeline_stages | Yes | Deal history references |
| activities | No | Lightweight, hard delete acceptable |
| notes | No | Author can truly remove |
| notifications | No | Ephemeral by nature |

### Behavioral Rules

**UI**: All list views filter by `deleted_at IS NULL` by default. Admin gets a "Trash" view per entity type showing soft-deleted records with restore/permanent-delete options.

**Automations**: Automation engine skips any entity where `deleted_at IS NOT NULL`. Enrollment cancellation triggers on soft delete.

**Reports**: Dashboard aggregations exclude soft-deleted records. Financial reports (invoices, quotes) include soft-deleted records with a visual indicator for audit completeness.

**FK Integrity**: Soft-deleted parents do not cascade. Child records remain accessible but display "(deleted)" next to the parent name. Hard delete is only available when zero child references exist.

### Why Hard Deletes Are Forbidden
- Breaks `action_logs` and `automation_execution_log` references
- Violates financial audit requirements (invoices, quotes)
- Prevents data recovery from accidental deletion
- Breaks deal stage history chain

### Admin Restoration
- Admin clicks "Restore" on trash view
- Sets `deleted_at = NULL`, `deleted_by = NULL`
- Logs restoration in `action_logs`

---

## 3. Feature Flag and Capability Control System

### Schema: `feature_flags`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| key | text UNIQUE | e.g. `automation_engine`, `ai_assist`, `sla_enforcement` |
| label | text | Human-readable name |
| description | text | What this flag controls |
| is_enabled | bool | Global default |
| scope | text | `global`, `role`, `user` |
| scope_config | jsonb | e.g. `{"roles": ["admin"]}` or `{"user_ids": ["..."]}` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: All authenticated SELECT; admin-only INSERT/UPDATE/DELETE.

### Evaluation Logic (in application code)

```text
1. Check user-specific override in scope_config.user_ids
2. Check role-based override in scope_config.roles
3. Fall back to is_enabled (global default)
```

Evaluation is a pure TypeScript utility function called in components and hooks. Results are cached in TanStack Query with a 5-minute stale time.

### UI Exposure Rules
- Components wrapped in a `<FeatureGate flag="key">` wrapper render nothing if flag is off
- Sidebar items check flags before rendering nav links
- API calls guarded at the hook level before making Supabase requests

### Use Cases
- `automation_engine`: Disable for clients who want manual-only workflows
- `ai_assist`: Enable only for premium-tier users
- `sla_enforcement`: Gradual rollout -- enable for admin first, then all roles
- `revenue_dashboard`: Gate behind a plan tier

### Safe Rollout
- New features ship with `is_enabled = false`
- Admin enables per-role first (e.g., admin-only testing)
- Expand to all users after validation
- Kill switch: set `is_enabled = false` to instantly disable globally

---

## 4. Observability and System Health Layer

### Schema: `system_health_logs`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_type | text | `cron_run`, `queue_depth`, `error_spike`, `sla_summary` |
| source | text | `job-worker`, `sla-monitor`, `automation-engine` |
| status | text | `ok`, `warning`, `critical` |
| metrics | jsonb | Flexible payload |
| message | text | Human-readable summary |
| created_at | timestamptz | |

**RLS**: Admin-only SELECT. System INSERT via service role.

### What Gets Logged
- Every cron execution: start time, duration, jobs processed, failures
- Every 15 minutes: queue depth snapshot (`pending`, `locked`, `dead` counts)
- Error spikes: when failure rate exceeds 10% in a 1-hour window
- SLA summaries: hourly breach count and resolution stats

### Alerting Rules
- Queue depth over 500: create admin notification (warning)
- Queue depth over 2000: create admin notification (critical)
- Failure rate over 10%: create admin notification
- No cron execution for 30+ minutes: create admin notification

### Admin Health Dashboard
An admin-only view showing:
- Real-time queue depth gauge
- Automation success rate (24h rolling)
- Average job execution time (chart)
- SLA breach trend (weekly)
- Error log feed (last 50 entries)
- System status indicator (green/yellow/red)

---

## 5. Domain Event Log (Event Sourcing Lite)

### Schema: `domain_events`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| event_type | text | e.g. `lead.created`, `deal.stage_changed`, `quote.sent`, `invoice.paid` |
| entity_type | text | `client`, `deal`, `contact`, etc. |
| entity_id | uuid | |
| actor_id | uuid | User or system who caused the event |
| actor_type | text | `user` or `system` |
| payload | jsonb | Event-specific data (before/after values) |
| metadata | jsonb | Request context (IP, user agent -- optional) |
| created_at | timestamptz | Immutable timestamp |

**RLS**: Admin SELECT. No UPDATE or DELETE ever. System INSERT via service role.

**Indexes**: `(entity_type, entity_id, created_at)`, `(event_type, created_at)`

### Event Emission Points
| Event | Trigger Point |
|---|---|
| `lead.created` | Client insert with status='lead' |
| `deal.stage_changed` | Deal update when stage differs |
| `deal.closed_won` | Deal stage set to closed_won |
| `quote.sent` | Quote status changed to 'sent' |
| `invoice.overdue` | SLA monitor detects past-due invoice |
| `activity.completed` | Activity status set to 'completed' |
| `automation.executed` | Automation engine completes a rule |

### How Automations Subscribe
- Automation rules reference `event_type` as their trigger
- The `automation-engine` job worker queries recent `domain_events` instead of scanning entity tables directly
- This decouples trigger detection from entity schema

### Benefits
- **Analytics**: Query event stream for funnel analysis, conversion tracking
- **AI readiness**: Event history becomes training/context data
- **Debugging**: Replay exact sequence of events for any entity
- **Audit**: Immutable, append-only log satisfies compliance requirements

---

## 6. Automation Simulation Mode

### Design
A "Dry Run" button on the automation rules admin UI that:
1. Admin selects an automation rule
2. Admin selects a target entity (or lets system pick a sample)
3. System evaluates the rule against the entity without writing
4. Results displayed in a modal

### Simulation Flow

```text
[Admin selects rule + entity]
      |
      v
[Edge Function: automation-simulate]
      |
      +-- Load rule config
      +-- Load entity data
      +-- Evaluate trigger conditions --> pass/fail
      +-- If pass: compute predicted actions
      |     +-- List field changes (before/after)
      |     +-- List tasks that would be created
      |     +-- List notifications that would fire
      +-- Return simulation result (no DB writes)
```

### Result Presentation
A read-only panel showing:
- Trigger evaluation: "Condition MET / NOT MET" with reason
- Predicted actions table: Action type, target, current value, new value
- Side effects: "Would create 1 task", "Would send 1 notification"
- Warning indicators for destructive actions (stage change, owner reassignment)

### Why No Real Writes
- Edge Function uses a read-only transaction (`BEGIN; ... ROLLBACK;`)
- Or simply computes results in memory without any INSERT/UPDATE calls
- Simulation results are ephemeral (not stored unless admin saves to notes)

### Competitive Advantage
Enterprise CRMs like Salesforce require deploying automation to a sandbox and running test records. This system lets admins simulate against real production data instantly, with zero risk.

---

## 7. Revenue Leakage Control Dashboard

### Definition of "Leak"
Revenue leakage is any scenario where a potential or committed dollar amount is at risk due to inaction:
- **Unresponded leads**: Lead created over 48 hours ago with zero activities
- **Stalled deals**: Deal with no activity for 14+ days in an active stage
- **Idle quotes**: Quote in 'sent' status with no follow-up for 7+ days
- **Overdue invoices**: Invoice past due_date with status not 'paid'

### Dashboard Widgets

| Widget | Query Logic | Display |
|---|---|---|
| Leads at Risk | clients WHERE status='lead' AND no activity in 48h | Count + total estimated value |
| Stalled Deals | deals WHERE stage NOT IN (won, lost) AND no activity in 14d | Count + pipeline value at risk |
| Idle Quotes | quotes WHERE status='sent' AND updated_at < now()-7d | Count + total value |
| Overdue Invoices | invoices WHERE due_date < now() AND status != 'paid' | Count + outstanding amount |
| **Total Revenue at Risk** | Sum of all above | Single headline number |

### "Run Auto Recovery" Action
A button that triggers pre-configured recovery sequences:
- Unresponded leads: enroll in "New Lead Follow-Up" sequence
- Stalled deals: create a task for the deal owner + send notification
- Idle quotes: create a follow-up task
- Overdue invoices: send payment reminder notification

This action is logged in `domain_events` and `action_logs` for full auditability.

### Why Owners Care
This is the first screen an owner checks each morning. It translates operational gaps directly into dollar amounts, making inaction feel costly.

---

## 8. Future AI-Ready Interfaces

### AI Context Builder
A utility function (not a table) that assembles a snapshot of any entity for AI consumption:

```text
ai_context = {
  entity: { type, id, current_data },
  recent_events: last 20 domain_events for this entity,
  recent_activities: last 10 activities,
  related_entities: linked contacts/accounts/deals,
  automation_history: last 10 automation executions,
  metrics: { days_in_stage, response_time, activity_count }
}
```

### Schema: `ai_suggestions`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_type | text | |
| entity_id | uuid | |
| suggestion_type | text | `follow_up_draft`, `next_action`, `risk_alert` |
| content | jsonb | The suggestion payload |
| status | text | `pending`, `accepted`, `dismissed` |
| accepted_by | uuid | nullable |
| created_at | timestamptz | |
| resolved_at | timestamptz | |

### Human-in-the-Loop Workflow

```text
[AI generates suggestion] --> pending
      |
      v
[User sees suggestion card on entity detail]
      |
      +-- "Accept" --> executes the suggested action, logs to domain_events
      +-- "Dismiss" --> marks dismissed, no action
      +-- "Edit & Accept" --> user modifies, then executes
```

### Hard Rule
AI never auto-executes. Every suggestion requires explicit human approval. This is enforced architecturally: the AI Edge Function only writes to `ai_suggestions`, never to entity tables.

---

## 9. Prioritized Add-On Roadmap

### Phase 1: Stability and Scale

| Component | Risk Reduced | Value Unlocked |
|---|---|---|
| Job queue system | Duplicate executions, cron overload | Reliable background processing at any volume |
| Soft delete standard | Data loss, broken references | Safe deletion with full recoverability |
| Domain event log | Opaque trigger chains, lost audit trail | Complete entity history, replay capability |

### Phase 2: Control and Visibility

| Component | Risk Reduced | Value Unlocked |
|---|---|---|
| Feature flags | Uncontrolled feature exposure, risky rollouts | Per-client capability control, safe deployments |
| Observability layer | Silent failures, blind spots | Proactive issue detection, enterprise confidence |
| Revenue leakage dashboard | Unnoticed lead/deal decay | Direct revenue protection, owner accountability |

### Phase 3: Differentiation

| Component | Risk Reduced | Value Unlocked |
|---|---|---|
| Automation simulation | Broken automations in production | Zero-risk testing against real data |
| Recovery actions | Manual intervention required for every leak | One-click automated recovery workflows |

### Phase 4: Intelligence

| Component | Risk Reduced | Value Unlocked |
|---|---|---|
| AI context builder | Unstructured data fed to AI | Clean, consistent input for any AI model |
| AI suggestions table | AI acting without oversight | Human-controlled AI assistance |
| Approval workflow | AI trust gap | Transparent, auditable AI interaction |

