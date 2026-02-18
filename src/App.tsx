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
import { QuotesView } from "@/components/crm/QuotesView";
import { InvoicesView } from "@/components/crm/InvoicesView";
import { DocumentsView } from "@/components/crm/DocumentsView";
import { FollowUpsView } from "@/components/crm/FollowUpsView";
import { ActionLogsView } from "@/components/crm/ActionLogsView";
import { AdminUsersView } from "@/components/crm/AdminUsersView";
import { RevenueLeakageView } from "@/components/crm/RevenueLeakageView";
import { PipelineStagesView } from "@/components/crm/PipelineStagesView";
import { TrashView } from "@/components/crm/TrashView";
import { TasksView } from "@/components/crm/TasksView";
import { RolePermissionsView } from "@/components/crm/RolePermissionsView";
import { FormsView } from "@/components/crm/FormsView";
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
              <Route path="revenue-leakage" element={<RevenueLeakageView />} />
              <Route path="tasks" element={<TasksView />} />
              <Route path="clients" element={<ClientsView />} />
              <Route path="contacts" element={<ContactsView />} />
              <Route path="accounts" element={<AccountsView />} />
              <Route path="deals" element={<DealsView />} />
              <Route path="activities" element={<ActivitiesView />} />
              <Route path="products" element={<ProductsView />} />
              <Route path="templates" element={<EmailTemplatesView />} />
              <Route path="automation" element={<AutomationRulesView />} />
              <Route path="pipeline-stages" element={<PipelineStagesView />} />
              <Route path="quotes" element={<QuotesView />} />
              <Route path="invoices" element={<InvoicesView />} />
              <Route path="documents" element={<DocumentsView />} />
              <Route path="followups" element={<FollowUpsView />} />
              <Route path="forms" element={<FormsView />} />
              <Route path="logs" element={<ActionLogsView />} />
              <Route path="trash" element={<TrashView />} />
              <Route path="admin" element={<AdminUsersView />} />
              <Route path="permissions" element={<RolePermissionsView />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
