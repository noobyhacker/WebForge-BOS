import { useMemo } from 'react';
import { StatCard } from './StatCard';
import { FollowUpItem } from './FollowUpItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, DollarSign, TrendingUp, Handshake, AlertTriangle } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useDeals } from '@/hooks/useDeals';
import { useActivities } from '@/hooks/useActivities';
import { useQuotes } from '@/hooks/useQuotes';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInHours, differenceInDays, startOfMonth } from 'date-fns';

export function DashboardView() {
  const { profile } = useAuth();
  const { clients, allClients, upcomingFollowUps, updateFollowUpStatus } = useClients(profile?.email || 'anonymous');
  const { deals } = useDeals();
  const { activities } = useActivities();
  const { quotes } = useQuotes();
  const { invoices } = useInvoices();

  const now = new Date();
  const monthStart = startOfMonth(now);

  // KPI 1: Leads this month
  const leadsThisMonth = useMemo(() =>
    clients.filter(c => c.status === 'lead' && new Date(c.createdAt) >= monthStart).length,
  [clients, monthStart]);

  // KPI 2: Avg response time (hours) for leads
  const avgResponseTime = useMemo(() => {
    const leads = clients.filter(c => c.status === 'lead');
    const responseTimes: number[] = [];
    for (const lead of leads) {
      const firstActivity = activities
        .filter(a => a.entityType === 'client' && a.entityId === lead.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      if (firstActivity) {
        const hours = differenceInHours(new Date(firstActivity.createdAt), new Date(lead.createdAt));
        responseTimes.push(hours);
      }
    }
    if (responseTimes.length === 0) return null;
    return Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length);
  }, [clients, activities]);

  // KPI 3: Revenue at risk
  const revenueAtRisk = useMemo(() => {
    // Stalled deals (no activity 14+ days)
    const stalledValue = deals
      .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
      .filter(d => {
        const lastAct = activities.filter(a => a.entityId === d.id && a.entityType === 'deal')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const lastDate = lastAct ? new Date(lastAct.createdAt) : new Date(d.updatedAt);
        return differenceInDays(now, lastDate) >= 14;
      })
      .reduce((s, d) => s + d.value, 0);

    // Idle quotes (sent 7+ days)
    const idleQuoteValue = quotes
      .filter(q => q.status === 'sent' && differenceInDays(now, new Date(q.updatedAt)) >= 7)
      .reduce((s, q) => s + q.grandTotal, 0);

    // Overdue invoices
    const overdueValue = invoices
      .filter(inv => inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < now)
      .reduce((s, inv) => s + (inv.grandTotal - inv.paidAmount), 0);

    return stalledValue + idleQuoteValue + overdueValue;
  }, [deals, quotes, invoices, activities, now]);

  // KPI 4: Deals in pipeline
  const openDeals = useMemo(() => deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)), [deals]);
  const totalPipeline = openDeals.reduce((s, d) => s + d.value, 0);

  // KPI 5: Win rate
  const winRate = useMemo(() => {
    const won = deals.filter(d => d.stage === 'closed_won').length;
    const lost = deals.filter(d => d.stage === 'closed_lost').length;
    const total = won + lost;
    return total > 0 ? Math.round((won / total) * 100) : 0;
  }, [deals]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Revenue engine overview.</p>
      </div>

      {/* 5 Core KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Leads This Month"
          value={leadsThisMonth}
          icon={Users}
          variant={leadsThisMonth > 0 ? 'primary' : 'default'}
        />
        <StatCard
          title="Avg Response Time"
          value={avgResponseTime !== null ? `${avgResponseTime}h` : 'N/A'}
          icon={Clock}
          variant={avgResponseTime !== null && avgResponseTime <= 1 ? 'success' : avgResponseTime !== null && avgResponseTime > 24 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Revenue at Risk"
          value={`$${revenueAtRisk.toLocaleString()}`}
          icon={revenueAtRisk > 0 ? AlertTriangle : DollarSign}
          variant={revenueAtRisk > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          title="Pipeline"
          value={`$${totalPipeline.toLocaleString()}`}
          icon={TrendingUp}
          variant="primary"
        />
        <StatCard
          title="Win Rate"
          value={deals.some(d => ['closed_won', 'closed_lost'].includes(d.stage)) ? `${winRate}%` : 'N/A'}
          icon={Handshake}
          variant={winRate >= 50 ? 'success' : winRate > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Follow-ups</h2>
            <span className="text-sm text-muted-foreground">{upcomingFollowUps.length} pending</span>
          </div>
          {upcomingFollowUps.length > 0 ? (
            <div className="space-y-2">
              {upcomingFollowUps.map((followUp) => (
                <FollowUpItem
                  key={followUp.id}
                  followUp={followUp}
                  showClient
                  onMarkComplete={(id) => updateFollowUpStatus(followUp.clientId, id, 'completed')}
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Open Deals</span>
              <span className="text-sm font-semibold">{openDeals.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Clients</span>
              <span className="text-sm font-semibold">{clients.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending Follow-ups</span>
              <span className="text-sm font-semibold">{upcomingFollowUps.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
