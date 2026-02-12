

# CRM Architecture Refactor: Routing + God Component Fix

This plan tackles the two highest-priority issues: replacing the `useState`-based navigation with real URL routing, and breaking up the God Component so each view manages its own data. This is a foundational refactor that makes all future improvements (Kanban, custom fields in forms, sharing UI, etc.) much easier.

---

## What Changes For You

- Every CRM section gets its own URL (e.g., `/deals`, `/contacts`, `/invoices`) -- you can bookmark pages, use browser back/forward, and share links
- The app loads faster because only the active view fetches its data, instead of all 15+ views loading simultaneously
- No visual changes -- everything looks and works the same, just better under the hood

---

## Technical Plan

### Step 1: Create a shared layout component

Create `src/components/crm/CrmLayout.tsx` -- a wrapper that renders the Sidebar + main content area. This replaces the layout logic currently in `Index.tsx`. It uses `<Outlet />` from React Router to render the active view.

### Step 2: Refactor each view to own its hooks

Each view component currently receives data and callbacks as props from `Index.tsx`. Instead, each view will call its own hooks internally. For example:

- **`ContactsView`** will call `useContacts()` and `useAccounts()` directly instead of receiving props
- **`DealsView`** will call `useDeals()`, `useAccounts()`, `useContacts()` directly
- **`DashboardView`** will call `useClients()`, `useDeals()` to compute its own stats
- Same pattern for all other views (Quotes, Invoices, Documents, etc.)

This means removing the prop interfaces from all ~18 view components and replacing them with internal hook calls.

### Step 3: Update Sidebar to use React Router links

Replace the `onViewChange` callback pattern with React Router's `<NavLink>` or `useNavigate()`. The sidebar reads the current route from the URL instead of from a `useState`. The route-to-view mapping:

| View | Route |
|------|-------|
| Dashboard | `/` |
| Clients | `/clients` |
| Contacts | `/contacts` |
| Accounts | `/accounts` |
| Deals | `/deals` |
| Activities | `/activities` |
| Products | `/products` |
| Email Templates | `/templates` |
| Automation | `/automation` |
| Lead Scoring | `/scoring` |
| Quotes | `/quotes` |
| Invoices | `/invoices` |
| Documents | `/documents` |
| Custom Fields | `/custom-fields` |
| Import/Export | `/import-export` |
| Permissions | `/permissions` |
| Sharing Groups | `/sharing-groups` |
| Follow-ups | `/followups` |
| Action Logs | `/logs` |
| Admin | `/admin` |

### Step 4: Update App.tsx routing

Replace the single `/` route with nested routes under a `CrmLayout` parent:

```
/auth          -> Auth page
/              -> CrmLayout wrapper
  /            -> DashboardView (index route)
  /clients     -> ClientsView
  /contacts    -> ContactsView
  /deals       -> DealsView
  ... etc for all views
  /admin       -> AdminUsersView (admin-only)
*              -> NotFound
```

### Step 5: Simplify Index.tsx

`Index.tsx` becomes a thin redirect or simply renders `<DashboardView />` as the index route. The God Component is eliminated entirely.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/crm/CrmLayout.tsx` | **New** -- layout with Sidebar + Outlet |
| `src/components/crm/Sidebar.tsx` | Replace callback nav with `useNavigate`/`useLocation` |
| `src/App.tsx` | Add nested route definitions |
| `src/pages/Index.tsx` | Gut entirely -- just re-exports or redirects |
| `src/components/crm/ContactsView.tsx` | Remove props, call `useContacts()` + `useAccounts()` internally |
| `src/components/crm/AccountsView.tsx` | Remove props, call `useAccounts()` internally |
| `src/components/crm/DealsView.tsx` | Remove props, call `useDeals()` + `useAccounts()` + `useContacts()` internally |
| `src/components/crm/DashboardView.tsx` | Remove props, call `useClients()` + `useDeals()` internally |
| `src/components/crm/ActivitiesView.tsx` | Remove props, call `useActivities()` internally |
| `src/components/crm/ProductsView.tsx` | Remove props, call `useProducts()` internally |
| `src/components/crm/EmailTemplatesView.tsx` | Remove props, call `useEmailTemplates()` internally |
| `src/components/crm/AutomationRulesView.tsx` | Remove props, call `useAutomationRules()` internally |
| `src/components/crm/LeadScoringView.tsx` | Remove props, call `useLeadScoringRules()` + `useClients()` + `useContacts()` internally |
| `src/components/crm/QuotesView.tsx` | Remove props, call `useQuotes()` + `useDeals()` + `useProducts()` internally |
| `src/components/crm/InvoicesView.tsx` | Remove props, call `useInvoices()` internally |
| `src/components/crm/DocumentsView.tsx` | Remove props, call `useDocuments()` internally |
| `src/components/crm/CustomFieldsView.tsx` | Remove props, call `useCustomFields()` internally |
| `src/components/crm/ImportExportView.tsx` | Remove props, call hooks internally |
| `src/components/crm/FieldPermissionsView.tsx` | Remove props, call `useFieldPermissions()` internally |
| `src/components/crm/SharingGroupsView.tsx` | Remove props, call `useSharingGroups()` internally |
| `src/components/crm/FollowUpsView.tsx` | Remove props, call `useClients()` internally |
| `src/components/crm/ActionLogsView.tsx` | Remove props, call `useClients()` internally |
| `src/components/crm/AdminUsersView.tsx` | No change (already self-contained) |

---

## Risk and Scope

- **No database or migration changes** -- this is purely a frontend refactor
- **No new dependencies** -- React Router is already installed
- **Behavioral parity** -- every feature works identically, just with proper URLs
- **Large surface area** -- ~22 files touched, but each change follows the same mechanical pattern (remove props, add hook calls, remove interface)

