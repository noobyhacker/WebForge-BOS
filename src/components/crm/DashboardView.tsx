import { useMemo } from 'react';
import { StatCard } from './StatCard';
import { FollowUpItem } from './FollowUpItem';
import { TaskCard } from './TaskCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, DollarSign, TrendingUp, Handshake, AlertTriangle, CheckSquare, CalendarClock, ArrowRight, Bell } from 'lucide-react';
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
  const { kpis } = useKpis();

  const now = new Date();
  const monthStart = startOfMonth(now);

  const leadsThisMonth = useMemo(() =>
    clients.filter(c => c.status === 'lead' && new Date(c.createdAt) >= monthStart).length,
  [clients, monthStart]);

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

  const openDeals = useMemo(() => deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)), [deals]);
  const totalPipeline = openDeals.reduce((s, d) => s + d.value, 0);

  const winRate = useMemo(() => {
    const won = deals.filter(d => d.stage === 'closed_won').length;
    const lost = deals.filter(d => d.stage === 'closed_lost').length;
    const total = won + lost;
    return total > 0 ? Math.round((won / total) * 100) : 0;
  }, [deals]);

  const stageDistribution = useMemo(() => {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    return stages.map(stage => ({
      name: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0),
      fill: STAGE_COLORS[stage] || PIE_COLORS[0],
    })).filter(s => s.count > 0);
  }, [deals]);

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

  const winLossData = useMemo(() => {
    const won = deals.filter(d => d.stage === 'closed_won').length;
    const lost = deals.filter(d => d.stage === 'closed_lost').length;
    if (won + lost === 0) return [];
    return [
      { name: 'Won', value: won, fill: 'hsl(var(--success))' },
      { name: 'Lost', value: lost, fill: 'hsl(var(--destructive))' },
    ];
  }, [deals]);

  const overdueFollowUps = upcomingFollowUps.filter(f => f.status === 'overdue');
  const scheduledFollowUps = upcomingFollowUps.filter(f => f.status !== 'overdue');

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Revenue engine overview</p>
        </div>
        <div className="flex items-center gap-2">
          {overdueFollowUps.length > 0 && (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-sm animate-pulse">
              <Bell className="h-3.5 w-3.5" />
              {overdueFollowUps.length} overdue follow-up{overdueFollowUps.length > 1 ? 's' : ''}
            </Badge>
          )}
          {myOverdueTasks.length > 0 && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm border-destructive text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {myOverdueTasks.length} overdue task{myOverdueTasks.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* ── FOLLOW-UPS: TOP PRIORITY SECTION ── */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              Upcoming Follow-ups
              {upcomingFollowUps.length > 0 && (
                <Badge variant="secondary" className="text-xs">{upcomingFollowUps.length}</Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/followups')}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {overdueFollowUps.length > 0 && (
            <p className="text-sm text-destructive font-medium mt-1">
              ⚠ {overdueFollowUps.length} overdue — action needed
            </p>
          )}
        </CardHeader>
        <CardContent>
          {upcomingFollowUps.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {/* Overdue first */}
              {overdueFollowUps.map((followUp) => (
                <div key={followUp.id} className="ring-1 ring-destructive/30 rounded-lg">
                  <FollowUpItem
                    followUp={followUp}
                    showClient
                    onMarkComplete={(id) => updateFollowUpStatus(followUp.clientId, id, 'completed')}
                  />
                </div>
              ))}
              {/* Then scheduled/pending */}
              {scheduledFollowUps.map((followUp) => (
                <FollowUpItem
                  key={followUp.id}
                  followUp={followUp}
                  showClient
                  onMarkComplete={(id) => updateFollowUpStatus(followUp.clientId, id, 'completed')}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarClock className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No pending follow-ups</p>
              <p className="text-sm opacity-70">You're all caught up!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Leads This Month" value={leadsThisMonth} icon={Users} variant={leadsThisMonth > 0 ? 'primary' : 'default'} />
        <StatCard title="Avg Response" value={avgResponseTime !== null ? `${avgResponseTime}h` : 'N/A'} icon={Clock} variant={avgResponseTime !== null && avgResponseTime <= 1 ? 'success' : avgResponseTime !== null && avgResponseTime > 24 ? 'destructive' : 'default'} />
        <StatCard title="At Risk" value={`$${revenueAtRisk.toLocaleString()}`} icon={revenueAtRisk > 0 ? AlertTriangle : DollarSign} variant={revenueAtRisk > 0 ? 'destructive' : 'success'} />
        <StatCard title="Pipeline" value={`$${totalPipeline.toLocaleString()}`} icon={TrendingUp} variant="primary" />
        <StatCard title="Win Rate" value={deals.some(d => ['closed_won', 'closed_lost'].includes(d.stage)) ? `${winRate}%` : 'N/A'} icon={Handshake} variant={winRate >= 50 ? 'success' : winRate > 0 ? 'warning' : 'default'} />
      </div>

      {/* ── TASKS + OPERATIONAL STATS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              My Tasks
              {myOverdueTasks.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{myOverdueTasks.length} overdue</Badge>
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

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* ── KPI TRACKER ── */}
      {kpis.filter(k => k.isActive).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              KPI Tracker
            </CardTitle>
            <Button variant="link" className="text-xs p-0 h-auto" onClick={() => navigate('/kpis')}>
              View all →
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {kpis.filter(k => k.isActive).slice(0, 6).map(kpi => {
                const progress = kpi.targetValue > 0 ? Math.min(Math.round((kpi.currentValue / kpi.targetValue) * 100), 100) : 0;
                const fmtVal = kpi.unit === 'currency' ? `$${kpi.currentValue.toLocaleString()}` : kpi.unit === 'percentage' ? `${kpi.currentValue}%` : kpi.currentValue.toLocaleString();
                return (
                  <div key={kpi.id} className="text-center p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <p className="text-xs text-muted-foreground truncate">{kpi.name}</p>
                    <p className="text-lg font-bold">{fmtVal}</p>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${progress >= 70 ? 'bg-[hsl(var(--success))]' : progress >= 40 ? 'bg-[hsl(var(--warning))]' : 'bg-destructive'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{progress}% of target</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win / Loss Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            {winLossData.length > 0 ? (
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={winLossData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0} activeShape={false} style={{ cursor: 'default', outline: 'none' }}>
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

      {/* ── LEADS TREND ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leads Trend (6 months)</CardTitle>
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
    </div>
  );
}
