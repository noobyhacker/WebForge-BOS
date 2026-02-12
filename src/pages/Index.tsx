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
import { useClients } from '@/hooks/useClients';
import { useContacts } from '@/hooks/useContacts';
import { useAccounts } from '@/hooks/useAccounts';
import { useDeals } from '@/hooks/useDeals';
import { useActivities } from '@/hooks/useActivities';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';

type View = 'dashboard' | 'clients' | 'followups' | 'logs' | 'admin' | 'contacts' | 'accounts' | 'deals' | 'activities' | 'products';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAdmin, profile } = useAuth();

  const {
    clients, allClients, stats, upcomingFollowUps, actionLogs,
    searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    addClient, updateClient, deleteClient, claimClient, serveClient,
    updateFollowUpStatus, addFollowUp, updateFollowUp, deleteFollowUp, restoreFromLog,
  } = useClients(profile?.email || 'anonymous');

  const { contacts, addContact, updateContact, deleteContact } = useContacts();
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { deals, addDeal, updateDeal, deleteDeal } = useDeals();
  const { activities, addActivity, updateActivity, deleteActivity } = useActivities();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-4 md:p-6 pt-16 md:pt-6">
          {activeView === 'dashboard' && (
            <DashboardView stats={stats} upcomingFollowUps={upcomingFollowUps} onMarkComplete={updateFollowUpStatus} />
          )}
          {activeView === 'clients' && (
            <ClientsView
              clients={clients} searchQuery={searchQuery} onSearchChange={setSearchQuery}
              statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
              onAddClient={addClient} onUpdateClient={updateClient} onDeleteClient={deleteClient}
              onClaimClient={claimClient} onServeClient={serveClient}
              onUpdateFollowUp={updateFollowUpStatus} onAddFollowUp={addFollowUp}
              onEditFollowUp={updateFollowUp} onDeleteFollowUp={deleteFollowUp}
            />
          )}
          {activeView === 'contacts' && (
            <ContactsView contacts={contacts} accounts={accounts} onAdd={addContact} onUpdate={updateContact} onDelete={deleteContact} />
          )}
          {activeView === 'accounts' && (
            <AccountsView accounts={accounts} onAdd={addAccount} onUpdate={updateAccount} onDelete={deleteAccount} />
          )}
          {activeView === 'deals' && (
            <DealsView deals={deals} accounts={accounts} contacts={contacts} onAdd={addDeal} onUpdate={updateDeal} onDelete={deleteDeal} />
          )}
          {activeView === 'activities' && (
            <ActivitiesView activities={activities} onAdd={addActivity} onUpdate={updateActivity} onDelete={deleteActivity} />
          )}
          {activeView === 'products' && (
            <ProductsView products={products} onAdd={addProduct} onUpdate={updateProduct} onDelete={deleteProduct} />
          )}
          {activeView === 'followups' && (
            <FollowUpsView clients={allClients} onMarkComplete={updateFollowUpStatus} onUpdateFollowUp={updateFollowUp} onDeleteFollowUp={deleteFollowUp} />
          )}
          {activeView === 'logs' && <ActionLogsView actionLogs={actionLogs} onRestore={restoreFromLog} />}
          {activeView === 'admin' && isAdmin && <AdminUsersView />}
        </div>
      </main>
    </div>
  );
};

export default Index;
