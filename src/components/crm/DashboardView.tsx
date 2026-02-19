import { useMemo } from 'react';
import { StatCard } from './StatCard';
import { FollowUpItem } from './FollowUpItem';
import { TaskCard } from './TaskCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, DollarSign, TrendingUp, Handshake, AlertTriangle, CheckSquare } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useDeals } from '@/hooks/useDeals';
import { useActivities } from '@/hooks/useActivities';
import { useQuotes } from '@/hooks/useQuotes';
import { useInvoices } from '@/hooks/useInvoices';
import { useTasks } from '@/hooks/useTasks';
import { useKpis } from '@/hooks/useKpis';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { differenceInHours, differenceInDays, startOfMonth, subMonths, format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  FunnelChart, Funnel, LabelList,
} from 'recharts';

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'hsl(var(--primary))',
  qualification: 'hsl(var(--warning))',
  proposal: 'hsl(38 80% 60%)',
  negotiation: 'hsl(280 60% 55%)',
  closed_won: 'hsl(var(--success))',
  closed_lost: 'hsl(var(--destructive))',
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(280 60% 55%)',
  'hsl(38 80% 60%)',
];

export function DashboardView() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { clients, allClients, upcomingFollowUps, updateFollowUpStatus } = useClients(profile?.email || 'anonymous');
  const { deals } = useDeals();
  const { activities } = useActivities();
  const { quotes } = useQuotes();
  const { invoices } = useInvoices();
  const { myTasks, myOverdueTasks, completeTask } = useTasks();

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
    const stalledValue = deals
      .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
      .filter(d => {
        const lastAct = activities.filter(a => a.entityId === d.id && a.entityType === 'deal')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const lastDate = lastAct ? new Date(lastAct.createdAt) : new Date(d.updatedAt);
        return differenceInDays(now, lastDate) >= 14;
      })
      .reduce((s, d) => s + d.value, 0);

    const idleQuoteValue = quotes
      .filter(q => q.status === 'sent' && differenceInDays(now, new Date(q.updatedAt)) >= 7)
      .reduce((s, q) => s + q.grandTotal, 0);

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

  // Chart data: Deal stage distribution
  const stageDistribution = useMemo(() => {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    return stages.map(stage => ({
      name: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0),
      fill: STAGE_COLORS[stage] || PIE_COLORS[0],
    })).filter(s => s.count > 0);
  }, [deals]);

  // Chart data: Pipeline funnel (open stages only)
  const funnelData = useMemo(() => {
    const openStages = ['prospecting', 'qualification', 'proposal', 'negotiation'];
    return openStages.map(stage => ({
      name: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0),
      count: deals.filter(d => d.stage === stage).length,
      fill: STAGE_COLORS[stage] || PIE_COLORS[0],
    }));
  }, [deals]);

  // Chart data: Leads per month (last 6 months)
  const leadsOverTime = useMemo(() => {
    const months: { name: string; leads: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = i === 0 ? now : startOfMonth(subMonths(now, i - 1));
      const count = clients.filter(c => c.status === 'lead' && new Date(c.createdAt) >= mStart && new Date(c.createdAt) < mEnd).length;
      months.push({ name: format(mStart, 'MMM'), leads: count });
    }
    return months;
  }, [clients, now]);

  // Chart data: Win/Loss pie
  const winLossData = useMemo(() => {
    const won = deals.filter(d => d.stage === 'closed_won').length;
    const lost = deals.filter(d => d.stage === 'closed_lost').length;
    if (won + lost === 0) return [];
    return [
      { name: 'Won', value: won, fill: 'hsl(var(--success))' },
      { name: 'Lost', value: lost, fill: 'hsl(var(--destructive))' },
    ];
  }, [deals]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-xs">
        <p className="font-medium text-foreground">{label || payload[0]?.name}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-muted-foreground">
            {p.name}: {typeof p.value === 'number' && p.value > 100 ? `$${p.value.toLocaleString()}` : p.value}
          </p>
        ))}
      </div>
    );
  };

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

      {/* My Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              My Tasks
              {myOverdueTasks.length > 0 && (
                <span className="text-xs text-destructive font-medium">{myOverdueTasks.length} overdue</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.filter(t => t.status !== 'done').length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {myTasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
                  <TaskCard key={task.id} task={task} onComplete={completeTask} compact />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No pending tasks
              </div>
            )}
            {myTasks.filter(t => t.status !== 'done').length > 5 && (
              <Button variant="link" className="w-full mt-2 text-xs" onClick={() => navigate('/tasks')}>
                View all tasks →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operational Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{openDeals.length}</p>
                <p className="text-xs text-muted-foreground">Open Deals</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{myOverdueTasks.length}</p>
                <p className="text-xs text-muted-foreground">Overdue Tasks</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{upcomingFollowUps.length}</p>
                <p className="text-xs text-muted-foreground">Pending Follow-ups</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{deals.filter(d => d.stage === 'closed_won').length}</p>
                <p className="text-xs text-muted-foreground">Deals Won</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Value by Stage */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stageDistribution.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageDistribution} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Value" activeBar={{ strokeWidth: 0, opacity: 0.8 }}>
                      {stageDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No deals yet</div>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win / Loss Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            {winLossData.length > 0 ? (
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                      activeShape={false}
                      style={{ cursor: 'default', outline: 'none' }}
                    >
                      {winLossData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground">{winRate}%</span>
                  <span className="text-xs text-muted-foreground">Win Rate</span>
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No closed deals</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads Trend + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads Trend (6mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsOverTime} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#leadsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Follow-ups</h2>
            <span className="text-sm text-muted-foreground">{upcomingFollowUps.length} pending</span>
          </div>
          {upcomingFollowUps.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
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
      </div>
    </div>
  );
}
