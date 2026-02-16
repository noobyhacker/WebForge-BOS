import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CrmLayout } from "@/components/crm/CrmLayout";
import { DashboardView } from "@/components/crm/DashboardView";
import { ClientsView } from "@/components/crm/ClientsView";
import { ContactsView } from "@/components/crm/ContactsView";
import { AccountsView } from "@/components/crm/AccountsView";
import { DealsView } from "@/components/crm/DealsView";
import { ActivitiesView } from "@/components/crm/ActivitiesView";
import { ProductsView } from "@/components/crm/ProductsView";
import { EmailTemplatesView } from "@/components/crm/EmailTemplatesView";
import { AutomationRulesView } from "@/components/crm/AutomationRulesView";
import { LeadScoringView } from "@/components/crm/LeadScoringView";
import { QuotesView } from "@/components/crm/QuotesView";
import { InvoicesView } from "@/components/crm/InvoicesView";
import { DocumentsView } from "@/components/crm/DocumentsView";
import { CustomFieldsView } from "@/components/crm/CustomFieldsView";
import { ImportExportView } from "@/components/crm/ImportExportView";
import { FieldPermissionsView } from "@/components/crm/FieldPermissionsView";
import { SharingGroupsView } from "@/components/crm/SharingGroupsView";
import { FollowUpsView } from "@/components/crm/FollowUpsView";
import { ActionLogsView } from "@/components/crm/ActionLogsView";
import { AdminUsersView } from "@/components/crm/AdminUsersView";
import { FormIntegrationView } from "@/components/crm/FormIntegrationView";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CrmLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardView />} />
              <Route path="clients" element={<ClientsView />} />
              <Route path="contacts" element={<ContactsView />} />
              <Route path="accounts" element={<AccountsView />} />
              <Route path="deals" element={<DealsView />} />
              <Route path="activities" element={<ActivitiesView />} />
              <Route path="products" element={<ProductsView />} />
              <Route path="templates" element={<EmailTemplatesView />} />
              <Route path="automation" element={<AutomationRulesView />} />
              <Route path="scoring" element={<LeadScoringView />} />
              <Route path="quotes" element={<QuotesView />} />
              <Route path="invoices" element={<InvoicesView />} />
              <Route path="documents" element={<DocumentsView />} />
              <Route path="custom-fields" element={<CustomFieldsView />} />
              <Route path="import-export" element={<ImportExportView />} />
              <Route path="permissions" element={<FieldPermissionsView />} />
              <Route path="sharing-groups" element={<SharingGroupsView />} />
              <Route path="followups" element={<FollowUpsView />} />
              <Route path="logs" element={<ActionLogsView />} />
              <Route path="form-integration" element={<FormIntegrationView />} />
              <Route path="admin" element={<AdminUsersView />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
