import { useState } from 'react';
import { Sidebar } from '@/components/crm/Sidebar';
import { DashboardView } from '@/components/crm/DashboardView';
import { ClientsView } from '@/components/crm/ClientsView';
import { FollowUpsView } from '@/components/crm/FollowUpsView';
import { ActionLogsView } from '@/components/crm/ActionLogsView';
import { AdminUsersView } from '@/components/crm/AdminUsersView';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';

type View = 'dashboard' | 'clients' | 'followups' | 'logs' | 'admin';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAdmin, profile } = useAuth();

  const {
    clients,
    allClients,
    stats,
    upcomingFollowUps,
    actionLogs,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    addClient,
    updateClient,
    deleteClient,
    updateFollowUpStatus,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
  } = useClients(profile?.email || 'anonymous');

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
            <DashboardView
              stats={stats}
              upcomingFollowUps={upcomingFollowUps}
              onMarkComplete={updateFollowUpStatus}
            />
          )}

          {activeView === 'clients' && (
            <ClientsView
              clients={clients}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onAddClient={addClient}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
              onUpdateFollowUp={updateFollowUpStatus}
              onAddFollowUp={addFollowUp}
              onEditFollowUp={updateFollowUp}
              onDeleteFollowUp={deleteFollowUp}
            />
          )}

          {activeView === 'followups' && (
            <FollowUpsView
              clients={allClients}
              onMarkComplete={updateFollowUpStatus}
              onUpdateFollowUp={updateFollowUp}
              onDeleteFollowUp={deleteFollowUp}
            />
          )}

          {activeView === 'logs' && <ActionLogsView actionLogs={actionLogs} />}

          {activeView === 'admin' && isAdmin && <AdminUsersView />}
        </div>
      </main>
    </div>
  );
};

export default Index;
