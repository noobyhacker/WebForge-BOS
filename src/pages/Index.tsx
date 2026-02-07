import { useState } from 'react';
import { Sidebar } from '@/components/crm/Sidebar';
import { DashboardView } from '@/components/crm/DashboardView';
import { ClientsView } from '@/components/crm/ClientsView';
import { FollowUpsView } from '@/components/crm/FollowUpsView';
import { useClients } from '@/hooks/useClients';

type View = 'dashboard' | 'clients' | 'followups';

const Index = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    clients,
    allClients,
    stats,
    upcomingFollowUps,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    addClient,
    updateFollowUpStatus,
    addFollowUp,
  } = useClients();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
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
              onUpdateFollowUp={updateFollowUpStatus}
              onAddFollowUp={addFollowUp}
            />
          )}

          {activeView === 'followups' && (
            <FollowUpsView
              clients={allClients}
              onMarkComplete={updateFollowUpStatus}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
