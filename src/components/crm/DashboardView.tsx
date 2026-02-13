import { useMemo } from 'react';
import { DealStage } from '@/types/crm';
import { StatCard } from './StatCard';
import { FollowUpItem } from './FollowUpItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Clock, DollarSign, TrendingUp, Handshake, Contact, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useClients } from '@/hooks/useClients';
import { useDeals } from '@/hooks/useDeals';
import { useContacts } from '@/hooks/useContacts';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/contexts/AuthContext';

const STAGE_CONFIG: Record<DealStage, { label: string; color: string }> = {
  prospecting: { label: 'Prospecting', color: 'hsl(221, 83%, 53%)' },
  qualification: { label: 'Qualification', color: 'hsl(271, 70%, 55%)' },
  proposal: { label: 'Proposal', color: 'hsl(38, 92%, 50%)' },
  negotiation: { label: 'Negotiation', color: 'hsl(25, 85%, 55%)' },
  closed_won: { label: 'Won', color: 'hsl(142, 76%, 36%)' },
  closed_lost: { label: 'Lost', color: 'hsl(0, 84%, 60%)' },
};

export function DashboardView() {
  const { profile } = useAuth();
  const { clients, allClients, upcomingFollowUps, updateFollowUpStatus } = useClients(profile?.email || 'anonymous');
  const { deals } = useDeals();
  const { contacts } = useContacts();
  const { accounts } = useAccounts();

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

  // Pipeline data for bar chart
  const pipelineData = (Object.keys(STAGE_CONFIG) as DealStage[])
    .filter(s => s !== 'closed_lost')
    .map(stage => ({
      name: STAGE_CONFIG[stage].label,
      value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
      count: deals.filter(d => d.stage === stage).length,
      fill: STAGE_CONFIG[stage].color,
    }));

  const closedDeals = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost');
  const winRate = closedDeals.length > 0
    ? Math.round((deals.filter(d => d.stage === 'closed_won').length / closedDeals.length) * 100)
    : 0;

  const openDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
  const totalPipeline = openDeals.reduce((s, d) => s + d.value, 0);
  const weightedPipeline = openDeals.reduce((s, d) => s + d.value * d.probability / 100, 0);
  const wonRevenue = deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + d.value, 0);
  const avgDealSize = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length) : 0;

  const stageDistribution = (Object.keys(STAGE_CONFIG) as DealStage[]).map(stage => ({
    name: STAGE_CONFIG[stage].label,
    value: deals.filter(d => d.stage === stage).length,
    color: STAGE_CONFIG[stage].color,
  })).filter(s => s.value > 0);

  // Build sparkline data from real deal stage counts & values
  const sparklines = useMemo(() => {
    const stages: DealStage[] = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

    // Per-stage deal counts as a distribution curve
    const stageCounts = stages.map(s => deals.filter(d => d.stage === s).length);
    // Per-stage deal values
    const stageValues = stages.map(s => deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0));
    // Cumulative clients over time (simulate growth using index-based slice of sorted clients)
    const sortedClients = [...clients].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const clientGrowth = Array.from({ length: Math.max(6, sortedClients.length) }, (_, i) => {
      const slice = Math.ceil(((i + 1) / Math.max(6, sortedClients.length)) * sortedClients.length);
      return slice;
    }).slice(-6);
    // Active clients growth (same approach)
    const activeClients = sortedClients.filter(c => c.status === 'active');
    const activeGrowth = Array.from({ length: Math.max(6, activeClients.length) }, (_, i) => {
      const slice = Math.ceil(((i + 1) / Math.max(6, activeClients.length)) * activeClients.length);
      return slice;
    }).slice(-6);

    const pad = (arr: number[], len: number) => {
      if (arr.length >= len) return arr.slice(-len);
      return [...Array(len - arr.length).fill(0), ...arr];
    };

    return {
      clients: pad(clientGrowth, 6),
      active: pad(activeGrowth, 6),
      contacts: pad(stageCounts, 6), // reuse stage distribution as a proxy
      accounts: pad(stageCounts.map((c, i) => c + (stageValues[i] ? 1 : 0)), 6),
      pipeline: pad(stageValues.slice(0, 4), 6), // open stages only
      weighted: pad(stageValues.slice(0, 4).map((v, i) => Math.round(v * (0.2 + i * 0.2))), 6),
      won: pad(stageValues, 6),
      winRate: pad(stageCounts, 6),
    };
  }, [clients, deals]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your CRM.</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={stats.totalClients} icon={Users} variant="default" sparklineData={sparklines.clients} />
        <StatCard title="Active Clients" value={stats.activeClients} icon={UserCheck} variant="success" sparklineData={sparklines.active} />
        <StatCard title="Contacts" value={stats.totalContacts} icon={Contact} variant="primary" sparklineData={sparklines.contacts} />
        <StatCard title="Accounts" value={stats.totalAccounts} icon={Building2} variant="default" sparklineData={sparklines.accounts} />
      </div>

      {/* Deal KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Pipeline" value={`$${totalPipeline.toLocaleString()}`} icon={DollarSign} variant="primary" sparklineData={sparklines.pipeline} />
        <StatCard title="Weighted Pipeline" value={`$${weightedPipeline.toLocaleString()}`} icon={TrendingUp} variant="default" sparklineData={sparklines.weighted} />
        <StatCard title="Won Revenue" value={`$${wonRevenue.toLocaleString()}`} icon={DollarSign} variant="success" sparklineData={sparklines.won} />
        <StatCard
          title="Win Rate"
          value={closedDeals.length > 0 ? `${winRate}%` : 'N/A'}
          icon={Handshake}
          variant={winRate >= 50 ? 'success' : winRate > 0 ? 'warning' : 'default'}
          sparklineData={sparklines.winRate}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pipelineData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Value']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                No deals data yet. Create deals to see pipeline analytics.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Deal Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stageDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stageDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {stageDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                No deals yet
              </div>
            )}
            {stageDistribution.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {stageDistribution.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups + Quick Stats */}
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
              <span className="text-sm text-muted-foreground">Total Deals</span>
              <span className="text-sm font-semibold">{deals.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Deal Size</span>
              <span className="text-sm font-semibold">${avgDealSize.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Open Deals</span>
              <span className="text-sm font-semibold">{openDeals.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending Follow-ups</span>
              <span className="text-sm font-semibold">{stats.pendingFollowUps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Overdue</span>
              <span className={`text-sm font-semibold ${stats.overdueFollowUps > 0 ? 'text-destructive' : ''}`}>{stats.overdueFollowUps}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
