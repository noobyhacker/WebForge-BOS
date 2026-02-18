import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from './StatCard';
import { useClients } from '@/hooks/useClients';
import { useDeals } from '@/hooks/useDeals';
import { useQuotes } from '@/hooks/useQuotes';
import { useInvoices } from '@/hooks/useInvoices';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Users, Handshake, FileText, Receipt, DollarSign, Clock, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, differenceInHours } from 'date-fns';

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

export function RevenueLeakageView() {
  const { profile } = useAuth();
  const { clients } = useClients(profile?.email || 'anonymous');
  const { deals } = useDeals();
  const { quotes } = useQuotes();
  const { invoices } = useInvoices();
  const { activities } = useActivities();

  const now = new Date();

  // 1. Unresponded leads: leads created >48h ago with zero activities
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

  // 2. Stalled deals: open deals with no activity for 14+ days
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

  // 3. Idle quotes: sent quotes with no update for 7+ days
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

  // 4. Overdue invoices: past due_date and not paid
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
        <StatCard
          title="Unresponded Leads"
          value={unrespondedLeads.length}
          icon={Users}
          variant={unrespondedLeads.length > 0 ? 'warning' : 'success'}
          sparklineData={[0, unrespondedLeads.length * 0.3, unrespondedLeads.length * 0.6, unrespondedLeads.length * 0.8, unrespondedLeads.length]}
        />
        <StatCard
          title="Stalled Deals"
          value={`$${stalledDealValue.toLocaleString()}`}
          icon={Handshake}
          variant={stalledDeals.length > 0 ? 'destructive' : 'success'}
          sparklineData={[0, stalledDealValue * 0.2, stalledDealValue * 0.5, stalledDealValue * 0.7, stalledDealValue]}
        />
        <StatCard
          title="Idle Quotes"
          value={`$${idleQuoteValue.toLocaleString()}`}
          icon={FileText}
          variant={idleQuotes.length > 0 ? 'warning' : 'success'}
          sparklineData={[0, idleQuoteValue * 0.3, idleQuoteValue * 0.5, idleQuoteValue * 0.8, idleQuoteValue]}
        />
        <StatCard
          title="Overdue Invoices"
          value={`$${overdueInvoiceValue.toLocaleString()}`}
          icon={Receipt}
          variant={overdueInvoices.length > 0 ? 'destructive' : 'success'}
          sparklineData={[0, overdueInvoiceValue * 0.4, overdueInvoiceValue * 0.6, overdueInvoiceValue * 0.9, overdueInvoiceValue]}
        />
      </div>

      {/* Detail tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-warning" />
              Unresponded Leads
              {unrespondedLeads.length > 0 && (
                <span className="ml-auto text-xs font-normal text-muted-foreground">{unrespondedLeads.length} leads</span>
              )}
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
                <span className="ml-auto text-xs font-normal text-muted-foreground">{stalledDeals.length} deals · ${stalledDealValue.toLocaleString()}</span>
              )}
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
                <span className="ml-auto text-xs font-normal text-muted-foreground">{idleQuotes.length} quotes · ${idleQuoteValue.toLocaleString()}</span>
              )}
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
                <span className="ml-auto text-xs font-normal text-muted-foreground">{overdueInvoices.length} invoices · ${overdueInvoiceValue.toLocaleString()}</span>
              )}
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