import { DashboardStats, FollowUp } from '@/types/crm';
import { StatCard } from './StatCard';
import { FollowUpItem } from './FollowUpItem';
import { Users, UserCheck, Clock, AlertTriangle } from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats;
  upcomingFollowUps: (FollowUp & { clientName: string; clientCompany: string })[];
  onMarkComplete: (clientId: string, followUpId: string, status: 'completed') => void;
}

export function DashboardView({ stats, upcomingFollowUps, onMarkComplete }: DashboardViewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your CRM.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Active Clients"
          value={stats.activeClients}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="Pending Follow-ups"
          value={stats.pendingFollowUps}
          icon={Clock}
          variant="primary"
        />
        <StatCard
          title="Overdue"
          value={stats.overdueFollowUps}
          icon={AlertTriangle}
          variant={stats.overdueFollowUps > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Upcoming Follow-ups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming Follow-ups</h2>
          <span className="text-sm text-muted-foreground">
            {upcomingFollowUps.length} pending
          </span>
        </div>

        {upcomingFollowUps.length > 0 ? (
          <div className="space-y-2">
            {upcomingFollowUps.map((followUp) => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                showClient
                onMarkComplete={(id) => onMarkComplete(followUp.clientId, id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No pending follow-ups</p>
            <p className="text-sm text-muted-foreground/70">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
