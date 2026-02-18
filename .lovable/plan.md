

# BOS v1.1 -- Operational Control Layer

## Summary

Upgrade the BOS from an automation-first CRM to an operational control system by adding: **Tasks**, **Entity Comments**, **RBAC with permissions**, and **executive-level analytics**. No feature bloat, no AI, no chat app.

---

## What Already Exists (Leverage, Don't Rebuild)

- `user_roles` table with `app_role` enum (`admin`, `user`, `sales`, `sales_manager`)
- `has_role()` security definer function used in all RLS policies
- `notifications` table with realtime subscription + `NotificationBell` component
- `notes` table + `NotesList` component on entity detail panels
- `activities` table (tasks, calls, emails, meetings)
- `action_logs` table for audit
- `domain_events` table (append-only)
- `useProfilesMap` hook for resolving user names
- Revenue leakage detection with stalled deals, idle quotes, overdue invoices
- Dashboard with 5 KPIs + charts

---

## 1. Database Migrations

### A. `tasks` table

```text
tasks
------
id           uuid PK default gen_random_uuid()
title        text NOT NULL
description  text default ''
status       text NOT NULL default 'todo'    -- todo, in_progress, blocked, done
priority     text NOT NULL default 'medium'  -- low, medium, high, critical
due_date     timestamptz
assigned_to  uuid NOT NULL (references no FK to auth.users)
created_by   uuid NOT NULL
related_entity_type text    -- lead, deal, invoice, client, quote, contact
related_entity_id   uuid
created_at   timestamptz default now()
updated_at   timestamptz default now()
completed_at timestamptz
deleted_at   timestamptz
deleted_by   uuid
```

**RLS Policies:**
- SELECT: admin sees all; users see tasks assigned to them or created by them
- INSERT: approved users, `created_by = auth.uid()`
- UPDATE: admin, or assigned_to = auth.uid(), or created_by = auth.uid()
- DELETE: admin, or created_by = auth.uid()

**Indexes:**
- `tasks(assigned_to, status, deleted_at)` for "My Tasks" dashboard
- `tasks(related_entity_type, related_entity_id)` for entity detail panels
- `tasks(due_date, status)` for overdue detection

### B. `entity_comments` table

```text
entity_comments
---------------
id          uuid PK default gen_random_uuid()
entity_type text NOT NULL
entity_id   uuid NOT NULL
user_id     uuid NOT NULL
content     text NOT NULL
created_at  timestamptz default now()
```

**RLS Policies:**
- SELECT: admin sees all; approved users see comments on entities they own or have access to (via `has_entity_access` or ownership check)
- INSERT: approved users, `user_id = auth.uid()`
- DELETE: admin or comment author (`user_id = auth.uid()`)
- No UPDATE (comments are immutable)

**Indexes:**
- `entity_comments(entity_type, entity_id, created_at)` for timeline

### C. `permissions` table

```text
permissions
-----------
id          uuid PK default gen_random_uuid()
key         text UNIQUE NOT NULL    -- e.g. 'delete_invoice', 'view_revenue', 'manage_tasks'
description text default ''
created_at  timestamptz default now()
```

**RLS:** admin full CRUD, all authenticated SELECT.

**Seed data (via insert tool after migration):**
- `view_dashboard`, `view_revenue`, `manage_clients`, `delete_client`, `manage_deals`, `delete_deal`, `manage_invoices`, `delete_invoice`, `manage_quotes`, `delete_quote`, `manage_tasks`, `delete_task`, `manage_users`, `view_reports`, `restore_trash`

### D. `role_permissions` table

```text
role_permissions
----------------
id            uuid PK default gen_random_uuid()
role          app_role NOT NULL
permission_id uuid NOT NULL references permissions(id) on delete cascade
UNIQUE(role, permission_id)
```

**RLS:** admin full CRUD, all authenticated SELECT.

### E. `has_permission()` security definer function

```sql
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.key = _permission_key
  )
$$;
```

### F. Update `app_role` enum

Add `finance` and `viewer` roles:
```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'viewer';
```

### G. Add `updated_at` trigger on `tasks`

Reuse existing `update_updated_at_column()` trigger function.

---

## 2. Hooks (New)

### `useTasks.ts`
- Fetch tasks for current user (assigned or created), filtered by `deleted_at IS NULL`
- CRUD operations
- Filter by status, priority, entity
- `myOverdueTasks` computed: status != 'done' AND due_date < now
- `completeTask` sets `completed_at` and `status = 'done'`
- Soft delete

### `useEntityComments.ts`
- Fetch comments for a given entity_type + entity_id
- Add comment (insert + create notification for entity owner)
- Delete comment (author only)
- Parse @mentions from content and create notifications

### `usePermissions.ts`
- Fetch all permissions
- Fetch role_permissions mapping
- `userCan(permissionKey)` helper using current user's roles
- Admin CRUD for role_permissions

---

## 3. Frontend Components

### A. `TasksView.tsx` (new route: `/tasks`)
- Full task list with filters: status, priority, assigned user
- Create/edit task dialog with entity linking (optional)
- Overdue tasks highlighted in red
- Bulk status update
- Sidebar nav item added

### B. `TaskCard.tsx` (new)
- Compact card for embedding in dashboard + entity detail panels
- Shows title, priority badge, due date, assigned user
- Quick-complete button

### C. `EntityCommentsSection.tsx` (new)
- Comment list with user avatars/names
- Input box with @mention support (simple text-based, no autocomplete UI)
- Integrated into `EntityDetailPanel` as a new tab

### D. `RolePermissionsView.tsx` (new route: `/admin/permissions`)
- Admin-only page
- Table: rows = roles, columns = permissions
- Toggle checkboxes to grant/revoke
- Linked from Admin section in sidebar

### E. Dashboard Updates (`DashboardView.tsx`)
- Add "My Tasks" section showing up to 5 overdue/upcoming tasks
- Add new analytics cards:
  - Avg deal cycle time (days from creation to closed_won)
  - Revenue per sales rep (bar chart, uses `useProfilesMap`)
  - SLA breach count
  - Overdue tasks count
- Each metric clickable to navigate to filtered view

### F. Revenue Leakage Updates (`RevenueLeakageView.tsx`)
- Add "Overdue Tasks" as a 5th leakage category
- Add revenue-per-rep comparison chart
- Add deal cycle time trend (line chart, last 6 months)

### G. Entity Detail Panel Updates (`EntityDetailPanel.tsx`)
- Add "Tasks" tab showing tasks linked to the entity
- Add "Comments" tab using `EntityCommentsSection`
- Add inline "Add Task" button

### H. Sidebar Updates
- Add "Tasks" nav item (with CheckSquare icon)
- Add "Permissions" under admin section

---

## 4. AuthContext Updates

- Add `userPermissions: string[]` state (fetched via role_permissions join)
- Add `hasPermission(key: string): boolean` helper
- Expose in context so all components can gate actions

---

## 5. Permission Enforcement in UI

Key enforcement points:
- Delete buttons: check `delete_client`, `delete_deal`, etc.
- Trash restore: check `restore_trash`
- Revenue Leakage page: check `view_revenue`
- Admin pages: check `manage_users`
- Task management: check `manage_tasks`

All checks use `hasPermission()` from AuthContext. Backend enforcement via RLS using `has_permission()` function where critical (delete operations).

---

## 6. Cron Processor Updates

Update `cron-processor` Edge Function to:
- Auto-cancel tasks when related entity is soft-deleted
- Include overdue task count in domain events

---

## 7. Implementation Order

1. Database migration (all tables + functions + indexes in one migration)
2. Seed permissions data (via insert tool)
3. Seed default role_permissions mappings (admin gets all, sales gets manage_clients/deals/tasks, etc.)
4. Update AuthContext with permissions
5. New hooks: useTasks, useEntityComments, usePermissions
6. New components: TasksView, TaskCard, EntityCommentsSection, RolePermissionsView
7. Update existing: DashboardView, RevenueLeakageView, EntityDetailPanel, Sidebar, App.tsx
8. Update cron-processor for task auto-cancel
9. Verification: RLS, permissions, soft-delete, indexes

---

## Technical Details

### File Changes Summary

| Action | File |
|--------|------|
| Migration | Create tasks, entity_comments, permissions, role_permissions tables |
| Migration | Add has_permission() function |
| Migration | Add finance/viewer to app_role enum |
| Migration | Add indexes on tasks, entity_comments |
| Insert | Seed permissions rows |
| Insert | Seed role_permissions mappings |
| Create | `src/hooks/useTasks.ts` |
| Create | `src/hooks/useEntityComments.ts` |
| Create | `src/hooks/usePermissions.ts` |
| Create | `src/components/crm/TasksView.tsx` |
| Create | `src/components/crm/TaskCard.tsx` |
| Create | `src/components/crm/EntityCommentsSection.tsx` |
| Create | `src/components/crm/RolePermissionsView.tsx` |
| Edit | `src/contexts/AuthContext.tsx` (add permissions) |
| Edit | `src/components/crm/DashboardView.tsx` (My Tasks + analytics) |
| Edit | `src/components/crm/RevenueLeakageView.tsx` (overdue tasks + charts) |
| Edit | `src/components/crm/EntityDetailPanel.tsx` (tasks + comments tabs) |
| Edit | `src/components/crm/Sidebar.tsx` (add Tasks + Permissions nav) |
| Edit | `src/App.tsx` (add routes) |
| Edit | `supabase/functions/cron-processor/index.ts` (task auto-cancel) |

### Default Role Permission Matrix

```text
Permission         | admin | sales_manager | sales | finance | viewer | user
-------------------|-------|---------------|-------|---------|--------|-----
view_dashboard     |  X    |      X        |   X   |    X    |   X    |  X
view_revenue       |  X    |      X        |       |    X    |   X    |
view_reports       |  X    |      X        |       |    X    |   X    |
manage_clients     |  X    |      X        |   X   |         |        |  X
delete_client      |  X    |      X        |       |         |        |
manage_deals       |  X    |      X        |   X   |         |        |  X
delete_deal        |  X    |      X        |       |         |        |
manage_invoices    |  X    |      X        |       |    X    |        |
delete_invoice     |  X    |               |       |         |        |
manage_quotes      |  X    |      X        |   X   |         |        |  X
delete_quote       |  X    |               |       |         |        |
manage_tasks       |  X    |      X        |   X   |    X    |        |  X
delete_task        |  X    |      X        |       |         |        |
manage_users       |  X    |               |       |         |        |
restore_trash      |  X    |               |       |         |        |
```

### Items NOT Being Implemented (per spec)

- Full chat system, chat rooms, typing indicators, presence
- Emoji reactions
- AI suggestions
- Complex permission inheritance (flat role-to-permission mapping only)
- Feature flags
- Multi-tenant infrastructure

