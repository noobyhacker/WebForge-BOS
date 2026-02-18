
# BOS v1 Implementation Plan

## Summary

This plan transforms the existing CRM into a revenue-enforcing Business Operating System. Most infrastructure already exists (soft delete on 8/10 tables, domain_events table, notifications table, pipeline_stages table, follow_up_sequences/steps tables). The work focuses on filling gaps, adding new tables (enrollments, SLA), building the cron-driven Edge Function, and streamlining the UI.

---

## What Already Exists (No Changes Needed)

- Soft delete columns on: clients, contacts, accounts, deals, products, quotes, invoices, automation_rules
- All hooks already filter by `deleted_at IS NULL`
- domain_events table (append-only, admin-only SELECT)
- notifications table with read/unread state
- pipeline_stages table with sort_order, is_won, is_lost, color
- follow_up_sequences + follow_up_sequence_steps tables
- RLS policies on all tables
- Revenue Leakage dashboard with Auto Recovery buttons
- Deal stage history tracking

## What Needs to Be Built

---

### 1. Database Migrations

**Add soft delete columns to missing tables:**
- `follow_up_sequences`: add `deleted_at`, `deleted_by`
- `pipeline_stages`: add `deleted_at`, `deleted_by`

**Create `follow_up_sequence_enrollments` table:**
- id, sequence_id, entity_type, entity_id, status (active/completed/cancelled), current_step_index, enrolled_at, completed_at, cancelled_at, last_step_executed_at, enrolled_by
- RLS: owner or admin can SELECT; insert via service role or approved users

**Rename `delay_days` to `delay_minutes` on `follow_up_sequence_steps`:**
- Add `delay_minutes` column (keep `delay_days` as fallback, or migrate values: delay_days * 1440)
- Add `action_type` column (notification | task | email) -- currently has `type` which serves this purpose, so we map it

**Create `sla_configs` table:**
- id, entity_type (default 'lead'), metric (default 'first_response'), threshold_minutes (default 30), is_active, created_at, updated_at
- RLS: admin CRUD, all authenticated SELECT

**Create `sla_breaches` table:**
- id, sla_config_id, entity_type, entity_id, owner_id, breached_at, resolved_at, threshold_minutes, actual_minutes, created_at
- RLS: admin SELECT all, owner SELECT own

**Add indexes for dashboard queries:**
- `deals(stage, deleted_at)` for pipeline queries
- `activities(entity_type, entity_id, created_at)` for SLA response time
- `clients(status, deleted_at, created_at)` for lead tracking
- `invoices(status, due_date, deleted_at)` for overdue detection

**Enable pg_cron and pg_net extensions** (required for scheduled Edge Function calls)

---

### 2. Edge Function: `cron-processor`

A single Edge Function that runs every 15 minutes via pg_cron. It handles three jobs in sequence:

**Job A -- Process Follow-Up Enrollments:**
1. Query active enrollments where next step is due
2. For each enrollment, check cancellation conditions (entity soft-deleted, entity status changed)
3. Execute the step action: insert notification, create activity task, or create email activity
4. Advance `current_step_index`; mark completed if no more steps
5. Idempotency: track `last_step_executed_at` to prevent duplicate execution

**Job B -- SLA Breach Detection:**
1. Query active SLA configs
2. For leads: find clients with status='lead' created > threshold_minutes ago with no activities
3. Create sla_breach record if not already breached
4. Create notification for the lead owner
5. Resolution: check if breached entities now have an activity, set resolved_at

**Job C -- Domain Event Emission:**
1. Check for recent state changes that should emit events (invoice overdue detection)
2. Insert into domain_events (append-only)

The Edge Function uses service role key for database access (bypasses RLS).

---

### 3. Frontend Changes

**A. Simplified Dashboard (`DashboardView.tsx`):**
Replace the current dashboard with 5 focused KPIs:
- Leads this month (count of clients with status='lead' created this month)
- Avg response time (average time to first activity for leads)
- Revenue at risk (sum from revenue leakage calculations)
- Deals in pipeline (count + value of open deals)
- Win rate (closed_won / total closed)

Remove the pie chart and bar chart. Keep follow-ups section.

**B. Notifications Dropdown:**
- Create `NotificationBell` component in the CRM header/layout
- Shows unread count badge
- Dropdown lists recent notifications with mark-as-read
- Hook: `useNotifications` to fetch/mark-read/delete

**C. Pipeline Stages Admin:**
- Create `PipelineStagesView.tsx` for managing stages
- Drag-to-reorder, color picker, is_won/is_lost toggles
- Prevent deletion if deals reference the stage (check deals table)
- Soft delete only
- Add sidebar nav item

**D. Update DealsView to use dynamic pipeline_stages:**
- Fetch pipeline_stages from DB instead of hardcoded `DealStage` enum
- Map stage values dynamically

**E. Entity Detail Enhancements:**
- Add follow-up enrollment status indicator on entity pages
- Add SLA timer countdown on lead detail (simple "time since creation" vs SLA threshold)
- Show automation/follow-up history from domain_events

**F. Revenue Leakage Dashboard Updates:**
- Auto Recovery now enrolls entities into follow_up_sequences (instead of just creating activities)
- Log recovery actions to domain_events

**G. Admin Trash View:**
- Create `TrashView.tsx` showing soft-deleted records across all entity types
- Restore button clears `deleted_at`/`deleted_by` and logs to action_logs
- Hard delete button only available when no child references

**H. Sidebar Cleanup:**
- Remove: Feature Flags, System Health, Lead Scoring, Automation Simulation (dry run button), Custom Fields, Import/Export, Sharing Groups, Permissions, Form Integration
- These are out of scope for BOS v1
- Keep only revenue-critical navigation items

---

### 4. Hook Changes

**`useNotifications.ts` (new):**
- Fetch notifications for current user
- Mark as read (update is_read + read_at)
- Delete notification
- Unread count

**`usePipelineStages.ts` (new):**
- CRUD for pipeline stages
- Check for deal references before delete
- Soft delete with restore

**`useFollowUpEnrollments.ts` (new):**
- Enroll entity into a sequence
- Cancel enrollment
- View enrollment status

**`useSlaBreaches.ts` (new):**
- Fetch breaches for current user's entities
- View breach details

**Update `useDeals.ts`:**
- Log deal stage changes to domain_events via a helper
- Use dynamic pipeline stages instead of hardcoded enum

**Update `RevenueLeakageView.tsx`:**
- Recovery actions create enrollments + domain_events instead of just activities

---

### 5. Cron Setup

After deploying the Edge Function, set up pg_cron to call it every 15 minutes:
```
SELECT cron.schedule(
  'bos-cron-processor',
  '*/15 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

This requires enabling pg_cron and pg_net extensions first.

---

## Technical Details

### File Changes Summary

| Action | File |
|--------|------|
| Migration | Add soft delete to follow_up_sequences, pipeline_stages |
| Migration | Create follow_up_sequence_enrollments |
| Migration | Create sla_configs, sla_breaches |
| Migration | Add delay_minutes to follow_up_sequence_steps |
| Migration | Add indexes for dashboard performance |
| Migration | Enable pg_cron, pg_net |
| Create | `supabase/functions/cron-processor/index.ts` |
| Create | `src/hooks/useNotifications.ts` |
| Create | `src/hooks/usePipelineStages.ts` |
| Create | `src/hooks/useFollowUpEnrollments.ts` |
| Create | `src/hooks/useSlaBreaches.ts` |
| Create | `src/components/crm/NotificationBell.tsx` |
| Create | `src/components/crm/PipelineStagesView.tsx` |
| Create | `src/components/crm/TrashView.tsx` |
| Edit | `src/components/crm/DashboardView.tsx` (simplify KPIs) |
| Edit | `src/components/crm/RevenueLeakageView.tsx` (enrollments + events) |
| Edit | `src/components/crm/CrmLayout.tsx` (add NotificationBell) |
| Edit | `src/components/crm/Sidebar.tsx` (cleanup nav items) |
| Edit | `src/components/crm/DealsView.tsx` (dynamic stages) |
| Edit | `src/hooks/useDeals.ts` (domain events on stage change) |
| Edit | `src/App.tsx` (add new routes, remove out-of-scope routes) |
| SQL insert | pg_cron schedule after Edge Function deploy |

### Implementation Order

1. Database migrations (all schema changes in one migration)
2. Edge Function (`cron-processor`)
3. New hooks (notifications, pipeline stages, enrollments, SLA)
4. New UI components (NotificationBell, PipelineStagesView, TrashView)
5. Edit existing components (Dashboard, Sidebar, Deals, Revenue Leakage, Layout)
6. pg_cron schedule setup
7. Verification pass (RLS, idempotency, soft delete filtering)

### Items NOT Being Implemented (per spec)

- Full job queue abstraction (existing job_queue table stays but unused)
- Observability dashboards (SystemHealthView removed from nav)
- Feature flag system (FeatureFlagsView removed from nav)
- Automation simulation (DryRunSimulationDialog stays in code but button removed)
- AI assist
- External email/SMS APIs
