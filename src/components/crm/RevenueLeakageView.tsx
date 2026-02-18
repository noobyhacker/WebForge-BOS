import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from './StatCard';
import { useClients } from '@/hooks/useClients';
import { useDeals } from '@/hooks/useDeals';
import { useQuotes } from '@/hooks/useQuotes';
import { useInvoices } from '@/hooks/useInvoices';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Users, Handshake, FileText, Receipt, DollarSign, Clock, TrendingDown, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, differenceInHours, addDays } from 'date-fns';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';

interface LeakItem {
  id: string;
  name: string;
  value: number;
  daysSince: number;
  type: string;
  owner?: string;
  stage?: string;
}

function LeakageTable({ items, emptyMessage, columns }: {
  items: LeakItem[];
  emptyMessage: string;
  columns: { label: string; key: keyof LeakItem | 'age' }[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.label} className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 10).map((item) => (
            <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              {columns.map(col => (
                <td key={col.label} className="py-2.5 px-3">
                  {col.key === 'value' ? (
                    <span className="font-semibold text-foreground">${(item.value || 0).toLocaleString()}</span>
                  ) : col.key === 'age' ? (
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                      item.daysSince > 14 ? 'bg-destructive/10 text-destructive' :
                      item.daysSince > 7 ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    )}>
                      <Clock className="h-3 w-3" />
                      {item.daysSince}d
                    </span>
                  ) : (
                    <span className="text-foreground">{String(item[col.key] ?? '')}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 10 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          +{items.length - 10} more items
        </p>
      )}
    </div>
  );
}

const LEAK_COLORS = [
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(38 80% 60%)',
  'hsl(0 60% 45%)',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground">{payload[0]?.name}</p>
      <p className="text-muted-foreground">${(payload[0]?.value || 0).toLocaleString()}</p>
    </div>
  );
};

export function RevenueLeakageView() {
  const { profile, user } = useAuth();
  const { clients } = useClients(profile?.email || 'anonymous');
  const { deals } = useDeals();
  const { quotes } = useQuotes();
  const { invoices } = useInvoices();
  const { activities, addActivity } = useActivities();
  const { toast } = useToast();
  const [recovering, setRecovering] = useState<string | null>(null);

  const now = new Date();

  // 1. Unresponded leads
  const unrespondedLeads = useMemo<LeakItem[]>(() => {
    const leads = clients.filter(c => c.status === 'lead');
    return leads.filter(lead => {
      const hoursSinceCreation = differenceInHours(now, new Date(lead.createdAt));
      if (hoursSinceCreation < 48) return false;
      const hasActivity = activities.some(a => a.entityId === lead.id && a.entityType === 'client');
      return !hasActivity;
    }).map(lead => ({
      id: lead.id,
      name: lead.name,
      value: 0,
      daysSince: differenceInDays(now, new Date(lead.createdAt)),
      type: 'lead',
      stage: lead.company || 'No company',
    }));
  }, [clients, activities]);

  // 2. Stalled deals
  const stalledDeals = useMemo<LeakItem[]>(() => {
    const openDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
    return openDeals.filter(deal => {
      const lastActivity = activities
        .filter(a => a.entityId === deal.id && a.entityType === 'deal')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const lastDate = lastActivity ? new Date(lastActivity.createdAt) : new Date(deal.updatedAt);
      return differenceInDays(now, lastDate) >= 14;
    }).map(deal => {
      const lastActivity = activities
        .filter(a => a.entityId === deal.id && a.entityType === 'deal')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const lastDate = lastActivity ? new Date(lastActivity.createdAt) : new Date(deal.updatedAt);
      return {
        id: deal.id,
        name: deal.name,
        value: deal.value,
        daysSince: differenceInDays(now, lastDate),
        type: 'deal',
        stage: deal.stage.replace('_', ' '),
      };
    }).sort((a, b) => b.value - a.value);
  }, [deals, activities]);

  // 3. Idle quotes
  const idleQuotes = useMemo<LeakItem[]>(() => {
    return quotes
      .filter(q => q.status === 'sent')
      .filter(q => differenceInDays(now, new Date(q.updatedAt)) >= 7)
      .map(q => ({
        id: q.id,
        name: q.quoteNumber,
        value: q.grandTotal,
        daysSince: differenceInDays(now, new Date(q.updatedAt)),
        type: 'quote',
        stage: q.dealName || q.accountName || 'No deal',
      }))
      .sort((a, b) => b.value - a.value);
  }, [quotes]);

  // 4. Overdue invoices
  const overdueInvoices = useMemo<LeakItem[]>(() => {
    return invoices
      .filter(inv => inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < now)
      .map(inv => ({
        id: inv.id,
        name: inv.invoiceNumber,
        value: inv.grandTotal - inv.paidAmount,
        daysSince: differenceInDays(now, new Date(inv.dueDate)),
        type: 'invoice',
        stage: inv.dealName || inv.accountName || 'No deal',
      }))
      .sort((a, b) => b.value - a.value);
  }, [invoices]);

  // Totals
  const stalledDealValue = stalledDeals.reduce((s, d) => s + d.value, 0);
  const idleQuoteValue = idleQuotes.reduce((s, q) => s + q.value, 0);
  const overdueInvoiceValue = overdueInvoices.reduce((s, i) => s + i.value, 0);
  const totalRevenueAtRisk = stalledDealValue + idleQuoteValue + overdueInvoiceValue;

  // Chart: Leakage breakdown donut
  const leakageBreakdown = useMemo(() => {
    const data = [];
    if (stalledDealValue > 0) data.push({ name: 'Stalled Deals', value: stalledDealValue });
    if (idleQuoteValue > 0) data.push({ name: 'Idle Quotes', value: idleQuoteValue });
    if (overdueInvoiceValue > 0) data.push({ name: 'Overdue Invoices', value: overdueInvoiceValue });
    return data;
  }, [stalledDealValue, idleQuoteValue, overdueInvoiceValue]);

  // Chart: Aging distribution
  const agingDistribution = useMemo(() => {
    const allItems = [...stalledDeals, ...idleQuotes, ...overdueInvoices];
    const buckets = [
      { label: '1-7d', min: 1, max: 7 },
      { label: '8-14d', min: 8, max: 14 },
      { label: '15-30d', min: 15, max: 30 },
      { label: '30d+', min: 31, max: Infinity },
    ];
    return buckets.map(b => ({
      name: b.label,
      count: allItems.filter(i => i.daysSince >= b.min && i.daysSince <= b.max).length,
      value: allItems.filter(i => i.daysSince >= b.min && i.daysSince <= b.max).reduce((s, i) => s + i.value, 0),
    }));
  }, [stalledDeals, idleQuotes, overdueInvoices]);

  // Recovery logic (unchanged)
  const runRecovery = async (category: 'leads' | 'deals' | 'quotes' | 'invoices') => {
    if (!user) return;
    setRecovering(category);
    try {
      let created = 0;
      const dueDate = addDays(new Date(), 2).toISOString();

      if (category === 'leads') {
        for (const lead of unrespondedLeads) {
          await addActivity({ type: 'task', subject: `Follow up with unresponded lead: ${lead.name}`, description: `Auto-created recovery task. Lead has been idle for ${lead.daysSince} days with no activity.`, entityType: 'client', entityId: lead.id, dueDate, status: 'pending' });
          created++;
        }
      } else if (category === 'deals') {
        for (const deal of stalledDeals) {
          await addActivity({ type: 'task', subject: `Re-engage stalled deal: ${deal.name}`, description: `Auto-created recovery task. Deal worth $${deal.value.toLocaleString()} has been idle for ${deal.daysSince} days at stage "${deal.stage}".`, entityType: 'deal', entityId: deal.id, dueDate, status: 'pending' });
          created++;
        }
      } else if (category === 'quotes') {
        for (const quote of idleQuotes) {
          await addActivity({ type: 'email', subject: `Follow up on idle quote: ${quote.name}`, description: `Auto-created recovery task. Quote worth $${quote.value.toLocaleString()} has had no update for ${quote.daysSince} days.`, entityType: 'quote', entityId: quote.id, dueDate, status: 'pending' });
          created++;
        }
      } else if (category === 'invoices') {
        for (const inv of overdueInvoices) {
          await addActivity({ type: 'email', subject: `Send payment reminder: ${inv.name}`, description: `Auto-created recovery task. Invoice has $${inv.value.toLocaleString()} outstanding, overdue by ${inv.daysSince} days.`, entityType: 'invoice', entityId: inv.id, dueDate, status: 'pending' });
          created++;
        }
      }

      toast({ title: 'Recovery tasks created', description: `Created ${created} follow-up ${created === 1 ? 'task' : 'tasks'}.` });
    } catch (err) {
      console.error('Recovery error:', err);
      toast({ title: 'Error', description: 'Failed to create recovery tasks.', variant: 'destructive' });
    } finally {
      setRecovering(null);
    }
  };

  const RecoveryButton = ({ category, count }: { category: 'leads' | 'deals' | 'quotes' | 'invoices'; count: number }) => {
    if (count === 0) return null;
    const isRunning = recovering === category;
    return (
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={isRunning || recovering !== null} onClick={() => runRecovery(category)}>
        {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
        {isRunning ? 'Creating...' : 'Auto Recover'}
      </Button>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-destructive" />
          Revenue Leakage
        </h1>
        <p className="text-muted-foreground">Identify and recover at-risk revenue across your pipeline.</p>
      </div>

      {/* Headline Revenue at Risk */}
      <Card className={cn(
        'border-2',
        totalRevenueAtRisk > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'
      )}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue at Risk</p>
              <p className={cn(
                'text-4xl font-bold tracking-tight mt-1',
                totalRevenueAtRisk > 0 ? 'text-destructive' : 'text-success'
              )}>
                ${totalRevenueAtRisk.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalRevenueAtRisk > 0
                  ? `Across ${stalledDeals.length + idleQuotes.length + overdueInvoices.length} items requiring attention`
                  : 'All clear — no revenue at risk right now'
                }
              </p>
            </div>
            <div className={cn(
              'rounded-full p-4',
              totalRevenueAtRisk > 0 ? 'bg-destructive/10' : 'bg-success/10'
            )}>
              {totalRevenueAtRisk > 0
                ? <AlertTriangle className="h-8 w-8 text-destructive" />
                : <DollarSign className="h-8 w-8 text-success" />
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Unresponded Leads" value={unrespondedLeads.length} icon={Users} variant={unrespondedLeads.length > 0 ? 'warning' : 'success'} />
        <StatCard title="Stalled Deals" value={`$${stalledDealValue.toLocaleString()}`} icon={Handshake} variant={stalledDeals.length > 0 ? 'destructive' : 'success'} />
        <StatCard title="Idle Quotes" value={`$${idleQuoteValue.toLocaleString()}`} icon={FileText} variant={idleQuotes.length > 0 ? 'warning' : 'success'} />
        <StatCard title="Overdue Invoices" value={`$${overdueInvoiceValue.toLocaleString()}`} icon={Receipt} variant={overdueInvoices.length > 0 ? 'destructive' : 'success'} />
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leakage Breakdown Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leakage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {leakageBreakdown.length > 0 ? (
              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leakageBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      activeShape={false}
                      style={{ cursor: 'default', outline: 'none' }}
                    >
                      {leakageBreakdown.map((_, i) => (
                        <Cell key={i} fill={LEAK_COLORS[i % LEAK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-xl font-bold text-foreground">${totalRevenueAtRisk.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">Total at Risk</span>
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No revenue at risk 🎉</div>
            )}
            {leakageBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-2 justify-center">
                {leakageBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LEAK_COLORS[i % LEAK_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium text-foreground">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aging Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aging Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {agingDistribution.some(b => b.count > 0) ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingDistribution} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-xs">
                            <p className="font-medium text-foreground">{label}</p>
                            <p className="text-muted-foreground">{payload[0]?.value} items</p>
                            <p className="text-muted-foreground">${(payload[1]?.value as number || 0).toLocaleString()} at risk</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Items" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} activeBar={{ strokeWidth: 0, opacity: 0.8 }} />
                    <Bar dataKey="value" name="Value" fill="hsl(var(--destructive) / 0.6)" radius={[4, 4, 0, 0]} activeBar={{ strokeWidth: 0, opacity: 0.8 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No items to display</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-warning" />
              Unresponded Leads
              {unrespondedLeads.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">{unrespondedLeads.length} leads</span>
              )}
              <span className="ml-auto"><RecoveryButton category="leads" count={unrespondedLeads.length} /></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeakageTable
              items={unrespondedLeads}
              emptyMessage="✓ All leads have been contacted"
              columns={[
                { label: 'Name', key: 'name' },
                { label: 'Company', key: 'stage' },
                { label: 'Idle', key: 'age' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Handshake className="h-4 w-4 text-destructive" />
              Stalled Deals
              {stalledDeals.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">{stalledDeals.length} deals · ${stalledDealValue.toLocaleString()}</span>
              )}
              <span className="ml-auto"><RecoveryButton category="deals" count={stalledDeals.length} /></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeakageTable
              items={stalledDeals}
              emptyMessage="✓ No stalled deals"
              columns={[
                { label: 'Deal', key: 'name' },
                { label: 'Value', key: 'value' },
                { label: 'Stage', key: 'stage' },
                { label: 'Idle', key: 'age' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning" />
              Idle Quotes
              {idleQuotes.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">{idleQuotes.length} quotes · ${idleQuoteValue.toLocaleString()}</span>
              )}
              <span className="ml-auto"><RecoveryButton category="quotes" count={idleQuotes.length} /></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeakageTable
              items={idleQuotes}
              emptyMessage="✓ No idle quotes"
              columns={[
                { label: 'Quote #', key: 'name' },
                { label: 'Value', key: 'value' },
                { label: 'Deal', key: 'stage' },
                { label: 'Idle', key: 'age' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-destructive" />
              Overdue Invoices
              {overdueInvoices.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">{overdueInvoices.length} invoices · ${overdueInvoiceValue.toLocaleString()}</span>
              )}
              <span className="ml-auto"><RecoveryButton category="invoices" count={overdueInvoices.length} /></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeakageTable
              items={overdueInvoices}
              emptyMessage="✓ No overdue invoices"
              columns={[
                { label: 'Invoice #', key: 'name' },
                { label: 'Outstanding', key: 'value' },
                { label: 'Deal', key: 'stage' },
                { label: 'Overdue', key: 'age' },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
