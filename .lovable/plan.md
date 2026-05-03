
# Relational Refactor: One Connected Account Graph

Single-tenant BOS already exists. The fix is to enforce a strict relational backbone across the existing entities, eliminate orphans, and unify the timeline — without inventing a new tenant layer.

## Naming reconciliation

Your spec uses "Client" as tenant. This app is single-tenant, and the existing `clients` table is functionally the **Lead/pursuit record** (per memory). To match your spec semantically:

- `clients` table → renamed to `leads` (the sales-state layer)
- All existing UI labels stay "Leads" (already the case in sidebar)
- `accounts`, `contacts`, `deals`, `activities` keep their names
- Tenant layer is implicit (single tenant) — no `client_id` columns added

## Target hierarchy (enforced)

```text
Account (company)            ── parent commercial entity
  ├── Contact (person)       ── account_id NOT NULL
  ├── Lead (pursuit)         ── account_id NOT NULL, primary_contact_id NOT NULL
  │     └── Deal             ── lead_id NOT NULL, account_id NOT NULL (denormalized)
  └── Activity (event)       ── account_id NOT NULL; contact_id, lead_id, deal_id optional
                                but at least one of {lead_id, deal_id, contact_id} required
```

## Phase 1 — Schema migration

### 1a. Rename + structural changes
- Rename table `clients` → `leads`. Update all FK references and the generated types regenerate automatically.
- Rename `clients.user_id` → `leads.owner_rep_id` (semantic alignment, keep as uuid).
- Add to `leads`: `account_id uuid`, `primary_contact_id uuid`, `pipeline_stage text`, `lead_score int default 0`, `qualification_status text default 'unqualified'`, `next_action_type text`, `next_action_date timestamptz`. Keep existing `status`, `notes`, etc.
- Add to `deals`: `lead_id uuid`. Keep existing `account_id`, drop `contact_id` (redundant — reachable via lead).
- Add to `activities`: `account_id uuid`, `contact_id uuid`, `lead_id uuid`, `deal_id uuid`. Keep `entity_type/entity_id` for one migration cycle, then drop after backfill.
- Add to `contacts`: nothing new — `account_id` already exists, just enforce.

### 1b. Backfill (auto-create missing parents)
Run inside the migration:

1. For every `contact` with NULL `account_id`: create a placeholder Account `"<Contact name> (auto)"` owned by the contact's owner, attach.
2. For every `lead` (formerly client) with no account: create placeholder Account from `company` field (or name); attach.
3. For every `lead` with no primary contact: create a Contact from `name`/`email`/`phone` under the lead's account; attach.
4. For every `deal` with NULL `account_id` but having `contact_id`: copy `contact.account_id`.
5. For every `deal` with no lead: create a placeholder Lead under the deal's account using the deal's name; attach.
6. For every `activity` with `entity_type='client'`: set `lead_id = entity_id`, then `account_id` and `contact_id` from that lead.
7. For every `activity` with `entity_type='contact'`: set `contact_id`, derive `account_id`.
8. For every `activity` with `entity_type='deal'`: set `deal_id`, derive `lead_id` and `account_id`.
9. Same pattern for `entity_comments`, `documents`, `follow_ups` — map polymorphic ref to typed columns where safe.

### 1c. Constraints (after backfill)
- `ALTER TABLE contacts ALTER COLUMN account_id SET NOT NULL;`
- `ALTER TABLE leads ALTER COLUMN account_id SET NOT NULL, ALTER COLUMN primary_contact_id SET NOT NULL;`
- `ALTER TABLE deals ALTER COLUMN account_id SET NOT NULL, ALTER COLUMN lead_id SET NOT NULL;`
- `ALTER TABLE activities ALTER COLUMN account_id SET NOT NULL;`
- Add real foreign keys with `ON DELETE RESTRICT` (soft-delete pattern means we never hard delete; this enforces integrity).
- Add CHECK on activities: `(contact_id IS NOT NULL OR lead_id IS NOT NULL OR deal_id IS NOT NULL)`.
- Add validation triggers (per project rules, not CHECK) to enforce:
  - `contacts.account_id` exists and not soft-deleted
  - `leads.primary_contact_id.account_id = leads.account_id`
  - `deals.lead_id.account_id = deals.account_id`
  - `activities` parent chain consistency (deal→lead→account, contact→account)

### 1d. Indexes
Add indexes on every new FK column for rollup performance.

## Phase 2 — Backend logic (triggers + functions)

- **Cascade-derive trigger** on `activities` insert/update: if only `deal_id` is provided, auto-fill `lead_id`, `account_id`, `contact_id` from the deal chain. Same for lead-only or contact-only inserts. This guarantees clients can pass minimal data and the row still rolls up.
- **Cascade-derive trigger** on `deals`: auto-fill `account_id` from `lead_id` if missing.
- **Cascade-derive trigger** on `leads`: auto-fill `account_id` from `primary_contact_id.account_id` if missing.
- **Soft-delete propagation**: when an Account is soft-deleted, block (raise) if it still has live children. Force user to detach/delete children first. Same for Contact (block if it's a lead's primary_contact). Surfaces orphan risk before it happens.
- **Lead → Deal conversion function** `convert_lead_to_deal(lead_id, value, name)`: creates a deal preserving lead_id, account_id; never duplicates contacts/activities.
- Update existing `handle_new_user`, `notify_chat_message`, etc. to reference `leads` instead of `clients`.
- Update `has_client_access`, `is_client_owner`, `can_edit_client` → renamed to `has_lead_access`, etc., with same logic.

## Phase 3 — RLS updates

All existing policies referencing `clients` get renamed to `leads`. No semantic change to access rules. `accounts`, `contacts`, `deals` policies remain — but since records now always have a parent chain, add a complementary policy: a user with access to a Lead automatically gets read on its Account + primary Contact + Deals + Activities (via `has_entity_access` extensions).

## Phase 4 — Unified activity timeline

Create a SQL view `entity_timeline` that is the single source for all timeline UI:

```text
SELECT 'activity' as kind, id, account_id, contact_id, lead_id, deal_id,
       owner_id as actor_id, subject as title, description as body,
       created_at, type
FROM activities WHERE deleted_at IS NULL
UNION ALL same shape from entity_comments, follow_ups, deal_stage_history,
domain_events (filtered to user-visible types), chat_messages.
```

UI timeline components (`ActivityTimeline.tsx`) query this view filtered by whichever entity is open:
- Account view: `WHERE account_id = $1`
- Contact view: `WHERE contact_id = $1`
- Lead view: `WHERE lead_id = $1`
- Deal view: `WHERE deal_id = $1`

One view, one component, four contexts. Eliminates the current fragmented timeline implementations.

## Phase 5 — Frontend refactor

### Hooks (`src/hooks/`)
- Rename `useClients.ts` → `useLeads.ts`. Update all imports across ~40 files.
- Update all hooks to send/expect the new required FK fields.
- `useDeals`: require `leadId` on create. Drop `contactId`.
- `useActivities`: accept any of `{accountId, contactId, leadId, dealId}` and let the trigger fill the rest; UI only needs to provide the most-specific one.
- New `useEntityTimeline(entity, id)` hook reading from the timeline view.

### Components (`src/components/crm/`)
- `AddClientDialog` → `AddLeadDialog`. Now requires picking/creating an Account and primary Contact inline (with "create new" affordance for both, single submit).
- Add Deal flow: requires picking a Lead (which scopes the Account automatically).
- Add Contact flow: requires Account.
- Add Activity flow: requires picking ONE parent (Account/Contact/Lead/Deal). Trigger fills the rest.
- `EntityDetailPanel`: replace per-entity ad-hoc tabs with a unified layout — Header, Children counts (rollup), unified Timeline, Comments. Used by Account/Contact/Lead/Deal detail views.
- Account detail: tabs for Contacts | Leads | Deals | Activities — all powered by typed FK queries, not entity_shares scans.
- Lead detail: shows the primary contact prominently, deal(s) underneath, full pursuit timeline.

### Sidebar / labels
- "Clients" → "Leads" everywhere user-facing (already mostly the case).

## Phase 6 — Cleanup (final migration)
After UI is migrated and stable:
- Drop `activities.entity_type`, `activities.entity_id`.
- Drop `entity_comments` polymorphic columns in favor of typed FKs (or keep polymorphic for true cross-entity notes — TBD during impl).
- Drop unused `client_assignments` if superseded by `entity_shares`, or keep and rename to `lead_assignments`.

## Risks & decisions baked in

- **Naming**: chose "Leads" (pursuit) over inventing a tenant `clients`. Matches single-tenant memory and current product reality.
- **Backfill**: auto-creates placeholder Accounts/Contacts for orphans so NOT NULL constraints can be applied without data loss. Placeholders are clearly marked `(auto)` so users can merge later.
- **No god components**: timeline view + small per-context wrapper, no monolithic component.
- **Memory updates needed** after impl: rename "Clients (Leads)" entries, update Lead Lifecycle entry, mark Activity model as canonical relational (not polymorphic).

## Out of scope (intentionally)

- True multi-tenancy (`client_id` on every table) — vetoed per single-tenant constraint.
- Hard-deleting orphans — backfill instead.
- UI redesign beyond what's needed to enforce the new required parents on create flows.
