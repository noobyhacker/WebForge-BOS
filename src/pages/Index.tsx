import { useState } from 'react';
import { Sidebar } from '@/components/crm/Sidebar';
import { DashboardView } from '@/components/crm/DashboardView';
import { ClientsView } from '@/components/crm/ClientsView';
import { FollowUpsView } from '@/components/crm/FollowUpsView';
import { ActionLogsView } from '@/components/crm/ActionLogsView';
import { AdminUsersView } from '@/components/crm/AdminUsersView';
import { ContactsView } from '@/components/crm/ContactsView';
import { AccountsView } from '@/components/crm/AccountsView';
import { DealsView } from '@/components/crm/DealsView';
import { ActivitiesView } from '@/components/crm/ActivitiesView';
import { ProductsView } from '@/components/crm/ProductsView';
import { EmailTemplatesView } from '@/components/crm/EmailTemplatesView';
import { AutomationRulesView } from '@/components/crm/AutomationRulesView';
import { LeadScoringView } from '@/components/crm/LeadScoringView';
import { QuotesView } from '@/components/crm/QuotesView';
import { InvoicesView } from '@/components/crm/InvoicesView';
import { DocumentsView } from '@/components/crm/DocumentsView';
import { CustomFieldsView } from '@/components/crm/CustomFieldsView';
import { ImportExportView } from '@/components/crm/ImportExportView';
import { FieldPermissionsView } from '@/components/crm/FieldPermissionsView';
import { SharingGroupsView } from '@/components/crm/SharingGroupsView';
import { useClients } from '@/hooks/useClients';
import { useContacts } from '@/hooks/useContacts';
import { useAccounts } from '@/hooks/useAccounts';
import { useDeals } from '@/hooks/useDeals';
import { useActivities } from '@/hooks/useActivities';
import { useProducts } from '@/hooks/useProducts';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useLeadScoringRules } from '@/hooks/useLeadScoring';
import { useQuotes } from '@/hooks/useQuotes';
import { useInvoices } from '@/hooks/useInvoices';
import { useDocuments } from '@/hooks/useDocuments';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useFieldPermissions } from '@/hooks/useFieldPermissions';
import { useSharingGroups } from '@/hooks/useSharingGroups';
import { useAuth } from '@/contexts/AuthContext';

type View = 'dashboard' | 'clients' | 'followups' | 'logs' | 'admin' | 'contacts' | 'accounts' | 'deals' | 'activities' | 'products' | 'templates' | 'automation' | 'scoring' | 'quotes' | 'invoices' | 'documents' | 'custom_fields' | 'import_export' | 'field_permissions' | 'sharing_groups';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAdmin, profile } = useAuth();

  const {
    clients, allClients, upcomingFollowUps, actionLogs,
    searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    addClient, updateClient, deleteClient, claimClient, serveClient,
    updateFollowUpStatus, addFollowUp, updateFollowUp, deleteFollowUp, restoreFromLog,
  } = useClients(profile?.email || 'anonymous');

  const { contacts, addContact, updateContact, deleteContact, bulkImportContacts } = useContacts();
  const { accounts, addAccount, updateAccount, deleteAccount, bulkImportAccounts } = useAccounts();
  const { deals, addDeal, updateDeal, deleteDeal, bulkImportDeals } = useDeals();
  const { activities, addActivity, updateActivity, deleteActivity } = useActivities();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useEmailTemplates();
  const { rules: automationRules, addRule: addAutomationRule, updateRule: updateAutomationRule, deleteRule: deleteAutomationRule } = useAutomationRules();
  const { rules: scoringRules, addRule: addScoringRule, updateRule: updateScoringRule, deleteRule: deleteScoringRule } = useLeadScoringRules();
  const { quotes, addQuote, updateQuoteStatus, deleteQuote } = useQuotes();
  const { invoices, generateFromQuote, updateInvoiceStatus, markPaid, deleteInvoice } = useInvoices();
  const { documents, uploadDocument, deleteDocument } = useDocuments();
  const { fields: customFields, addField: addCustomField, updateField: updateCustomField, deleteField: deleteCustomField } = useCustomFields();
  const { permissions: fieldPermissions, addPermission: addFieldPermission, updatePermission: updateFieldPermission, deletePermission: deleteFieldPermission } = useFieldPermissions();
  const { groups: sharingGroups, addGroup: addSharingGroup, updateGroup: updateSharingGroup, deleteGroup: deleteSharingGroup } = useSharingGroups();

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    pendingFollowUps: allClients.flatMap(c => c.followUps).filter(f => f.status === 'pending' || f.status === 'scheduled').length,
    overdueFollowUps: allClients.flatMap(c => c.followUps).filter(f => f.status === 'overdue').length,
    totalContacts: contacts.length,
    totalAccounts: accounts.length,
    totalDeals: deals.length,
    totalPipelineValue: deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0),
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-4 md:p-6 pt-16 md:pt-6">
          {activeView === 'dashboard' && <DashboardView stats={stats} upcomingFollowUps={upcomingFollowUps} onMarkComplete={updateFollowUpStatus} deals={deals} />}
          {activeView === 'clients' && (
            <ClientsView clients={clients} searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} onAddClient={addClient} onUpdateClient={updateClient} onDeleteClient={deleteClient} onClaimClient={claimClient} onServeClient={serveClient} onUpdateFollowUp={updateFollowUpStatus} onAddFollowUp={addFollowUp} onEditFollowUp={updateFollowUp} onDeleteFollowUp={deleteFollowUp} />
          )}
          {activeView === 'contacts' && <ContactsView contacts={contacts} accounts={accounts} onAdd={addContact} onUpdate={updateContact} onDelete={deleteContact} />}
          {activeView === 'accounts' && <AccountsView accounts={accounts} onAdd={addAccount} onUpdate={updateAccount} onDelete={deleteAccount} />}
          {activeView === 'deals' && <DealsView deals={deals} accounts={accounts} contacts={contacts} onAdd={addDeal} onUpdate={updateDeal} onDelete={deleteDeal} />}
          {activeView === 'activities' && <ActivitiesView activities={activities} onAdd={addActivity} onUpdate={updateActivity} onDelete={deleteActivity} />}
          {activeView === 'products' && <ProductsView products={products} onAdd={addProduct} onUpdate={updateProduct} onDelete={deleteProduct} />}
          {activeView === 'templates' && <EmailTemplatesView templates={templates} onAdd={addTemplate} onUpdate={updateTemplate} onDelete={deleteTemplate} />}
          {activeView === 'automation' && <AutomationRulesView rules={automationRules} onAdd={addAutomationRule} onUpdate={updateAutomationRule} onDelete={deleteAutomationRule} />}
          {activeView === 'scoring' && <LeadScoringView rules={scoringRules} clients={clients} contacts={contacts} onAdd={addScoringRule} onUpdate={updateScoringRule} onDelete={deleteScoringRule} />}
          {activeView === 'quotes' && <QuotesView quotes={quotes} deals={deals} products={products} onAdd={addQuote} onUpdateStatus={updateQuoteStatus} onDelete={deleteQuote} onGenerateInvoice={generateFromQuote} />}
          {activeView === 'invoices' && <InvoicesView invoices={invoices} onUpdateStatus={updateInvoiceStatus} onMarkPaid={markPaid} onDelete={deleteInvoice} />}
          {activeView === 'documents' && <DocumentsView documents={documents} onUpload={uploadDocument} onDelete={deleteDocument} />}
          {activeView === 'custom_fields' && <CustomFieldsView fields={customFields} onAdd={addCustomField} onUpdate={updateCustomField} onDelete={deleteCustomField} />}
          {activeView === 'import_export' && <ImportExportView contacts={contacts} accounts={accounts} deals={deals} onImportContacts={bulkImportContacts} onImportAccounts={bulkImportAccounts} onImportDeals={bulkImportDeals} />}
          {activeView === 'field_permissions' && <FieldPermissionsView permissions={fieldPermissions} onAdd={addFieldPermission} onUpdate={updateFieldPermission} onDelete={deleteFieldPermission} />}
          {activeView === 'sharing_groups' && <SharingGroupsView groups={sharingGroups} onAdd={addSharingGroup} onUpdate={updateSharingGroup} onDelete={deleteSharingGroup} />}
          {activeView === 'followups' && <FollowUpsView clients={allClients} onMarkComplete={updateFollowUpStatus} onUpdateFollowUp={updateFollowUp} onDeleteFollowUp={deleteFollowUp} />}
          {activeView === 'logs' && <ActionLogsView actionLogs={actionLogs} onRestore={restoreFromLog} />}
          {activeView === 'admin' && isAdmin && <AdminUsersView />}
        </div>
      </main>
    </div>
  );
};

export default Index;
