

# CRM Expansion Plan -- Phased Approach

## Important Note

Building a full Zoho CRM equivalent is a **multi-month engineering project**. Your current app has a solid foundation (auth, clients, follow-ups, action logs, RLS, admin panel), so we can expand it incrementally. Each phase below is designed to be self-contained and functional before moving to the next.

**Recommendation**: Tackle this one phase at a time. Each phase is a separate conversation/set of prompts. Trying to do everything at once will produce lower quality results.

---

## Phase 1: Core Data Models (Start Here)

Expand the database schema and UI to support the core CRM entities beyond clients/follow-ups.

### Database Tables to Add
- **contacts** -- individual people (linked to accounts)
- **accounts** -- companies/organizations
- **deals** -- opportunities with pipeline stages, value, probability, owner
- **activities** -- tasks, calls, meetings, reminders (replaces current follow-ups concept)
- **products** -- services/products catalog with pricing
- **tags** and **entity_tags** -- polymorphic tagging system
- **notes** -- polymorphic notes (attachable to any entity)

### UI Changes
- Add sidebar navigation items: Contacts, Accounts, Deals, Activities, Products
- Create list + detail views for each entity (following existing ClientsView/ClientDetails pattern)
- Add a **Deals Pipeline** view with drag-and-drop Kanban board (stages: Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost)

### Migration Script
- Extend `SUPABASE_MIGRATION.sql` with new tables, RLS policies using existing `has_role()` pattern
- Each entity gets owner-based + admin access policies

---

## Phase 2: Deals Pipeline and Analytics

### Pipeline Board
- Kanban-style view for deals grouped by stage
- Drag to change stage (with confirmation)
- Deal cards showing value, probability, contact, expected close date

### Dashboard Enhancements
- Sales pipeline visualization (bar chart by stage using Recharts -- already installed)
- Lead conversion funnel
- Revenue summary (total deal value by stage)
- KPI stat cards: total pipeline value, win rate, average deal size

---

## Phase 3: Activities and Communication

### Activity System
- Unified activity timeline per record (calls, emails, meetings, tasks)
- Activity scheduling with reminders
- Internal notes with mentions (@user)
- Email templates (stored in DB, selectable when creating email activities)

### Activity Timeline Component
- Chronological feed showing all interactions for a contact/deal/account
- Filter by activity type

---

## Phase 4: Automation Engine

### Rule Builder UI
- Admin page to create automation rules
- Trigger selection: record created, field updated, time-based
- Action selection: update field, assign owner, create task, change deal stage
- Rules stored in a `automation_rules` table

### Lead Scoring
- Configurable scoring rules (source, engagement, activity count)
- Score displayed on lead/contact cards
- Auto-assign leads above threshold

### Implementation
- Edge function that evaluates rules on record changes (triggered via database webhooks or polling)

---

## Phase 5: Quotes, Invoices, and Documents

### Quotes
- Create quotes linked to deals, pulling from products catalog
- Line items with quantity, discount, tax
- Quote status: draft, sent, accepted, rejected

### Invoices
- Generate from accepted quotes
- Invoice numbering, due dates, payment status
- Printable/PDF-ready layout

### Documents
- File attachments via Supabase Storage (not database)
- Link documents to any entity

---

## Phase 6: Customization and Admin

### Custom Fields
- Admin UI to add custom fields (text, number, date, dropdown) to any entity
- Stored in a `custom_fields` definition table + `custom_field_values` data table
- Rendered dynamically in entity forms

### Import/Export
- CSV import for contacts, accounts, deals
- CSV export for any list view

---

## Phase 7: Security Hardening

### Field-Level Permissions
- Define which roles can see/edit specific fields
- Enforced at UI level with RLS for sensitive data

### Record Sharing Rules
- Extend existing `client_shares` pattern to all entities
- Team-based sharing groups

---

## What Gets Built First (Phase 1 Detail)

### New Files
- `src/types/crm.ts` -- expand with Contact, Account, Deal, Activity, Product types
- `src/hooks/useContacts.ts`, `useAccounts.ts`, `useDeals.ts`, `useActivities.ts`, `useProducts.ts`
- `src/components/crm/ContactsView.tsx`, `ContactDetails.tsx`
- `src/components/crm/AccountsView.tsx`, `AccountDetails.tsx`
- `src/components/crm/DealsView.tsx`, `DealCard.tsx`, `DealPipeline.tsx`
- `src/components/crm/ActivitiesView.tsx`
- `src/components/crm/ProductsView.tsx`

### Modified Files
- `SUPABASE_MIGRATION.sql` -- add all new tables with RLS
- `src/components/crm/Sidebar.tsx` -- add new nav items
- `src/pages/Index.tsx` -- add new view routing

### Database Schema (Phase 1)

```text
contacts
  id, first_name, last_name, email, phone, account_id (FK), owner_id (FK auth.users), 
  status, source, created_at, updated_at

accounts
  id, name, industry, website, phone, address, owner_id (FK auth.users),
  created_at, updated_at

deals
  id, name, account_id (FK), contact_id (FK), owner_id (FK auth.users),
  stage (enum), value (numeric), probability (int), expected_close_date,
  created_at, updated_at

activities
  id, type (enum: call/email/meeting/task), subject, description,
  entity_type (text), entity_id (uuid), owner_id (FK auth.users),
  due_date, completed_at, status, created_at

products
  id, name, description, price (numeric), sku, is_active,
  created_at, updated_at
```

---

## Recommended Approach

Ask for **one phase at a time**. For Phase 1, you could further break it down:
1. "Add contacts and accounts tables and views"
2. "Add deals with pipeline Kanban board"
3. "Add activities system"
4. "Add products catalog"

This keeps each change manageable and testable.

