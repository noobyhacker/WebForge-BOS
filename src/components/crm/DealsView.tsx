import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Deal, DealStage } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, DollarSign, Trash2, Pencil, TrendingUp, GripVertical, UserCircle, ArrowRight, Clock, Archive, BarChart3, Trophy, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { EntityDetailPanel } from './EntityDetailPanel';
import { useDeals } from '@/hooks/useDeals';
import { useAccounts } from '@/hooks/useAccounts';
import { useContacts } from '@/hooks/useContacts';
import { useClients } from '@/hooks/useClients';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useDealStageHistory } from '@/hooks/useDealStageHistory';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

const STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { value: 'qualification', label: 'Qualification', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  { value: 'proposal', label: 'Proposal', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
];

const CLOSED_STAGES: DealStage[] = ['closed_won', 'closed_lost'];
const PIE_COLORS = ['hsl(217, 91%, 60%)', 'hsl(271, 91%, 65%)', 'hsl(45, 93%, 47%)', 'hsl(24, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

const getStageName = (stage: string) => STAGES.find(s => s.value === stage)?.label || stage;

export function DealsView() {
  const { deals, archivedDeals: archivedDealsFromDb, addDeal, updateDeal, deleteDeal, archiveDeals } = useDeals();
  const { accounts } = useAccounts();
  const { contacts } = useContacts();
  const { clients: leads } = useClients();
  const { getOwnerName, getOwnerRole } = useProfilesMap();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [activeTab, setActiveTab] = useState('active');
  const [form, setForm] = useState({ name: '', leadId: '' as string | undefined, accountId: '' as string | undefined, contactId: '' as string | undefined, stage: 'prospecting' as DealStage, value: 0, probability: 20, expectedCloseDate: '' });

  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DealStage | null>(null);
  const [selectedForArchive, setSelectedForArchive] = useState<Set<string>>(new Set());
  const [lostReasonDialog, setLostReasonDialog] = useState<{ dealId: string; fromStage: DealStage } | null>(null);
  const [lostReason, setLostReason] = useState('');

  const { history: stageHistory, addHistoryEntry } = useDealStageHistory(selectedDeal?.id || null);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (!selectedId) return;
    const all = [...deals, ...archivedDealsFromDb];
    if (all.length === 0) return;
    const d = all.find(x => x.id === selectedId);
    if (d) {
      setSelectedDeal(d);
      if (archivedDealsFromDb.some(x => x.id === d.id)) setActiveTab('archived');
      searchParams.delete('selected');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, deals, archivedDealsFromDb]);

  const searchFiltered = useCallback((list: Deal[]) =>
    list.filter(d => `${d.name} ${d.accountName} ${d.contactName}`.toLowerCase().includes(search.toLowerCase())),
  [search]);

  const filtered = searchFiltered(activeTab === 'active' ? deals : activeTab === 'archived' ? archivedDealsFromDb : deals);
  const currentSelected = selectedDeal ? ([...deals, ...archivedDealsFromDb].find(d => d.id === selectedDeal.id) || null) : null;
  const resetForm = () => setForm({ name: '', leadId: '', accountId: '', contactId: '', stage: 'prospecting', value: 0, probability: 20, expectedCloseDate: '' });

  const changeDealStage = useCallback(async (dealId: string, fromStage: DealStage, toStage: DealStage, note?: string) => {
    await updateDeal(dealId, {
      stage: toStage,
      ...(toStage === 'closed_lost' && note ? { lostReason: note } : {})
    });
    await addHistoryEntry({ dealId, fromStage, toStage, note });
  }, [updateDeal, addHistoryEntry]);

  const handleStageChange = useCallback((dealId: string, fromStage: DealStage, toStage: DealStage) => {
    if (toStage === 'closed_lost') {
      setLostReasonDialog({ dealId, fromStage });
      setLostReason('');
    } else {
      changeDealStage(dealId, fromStage, toStage);
    }
  }, [changeDealStage]);

  const handleLostReasonSubmit = async () => {
    if (!lostReasonDialog || !lostReason.trim()) return;
    await changeDealStage(lostReasonDialog.dealId, lostReasonDialog.fromStage, 'closed_lost', lostReason.trim());
    setLostReasonDialog(null);
    setLostReason('');
  };

  const handleAdd = async () => { await addDeal({ ...form, accountId: form.accountId || undefined, contactId: form.contactId || undefined } as any); setShowAdd(false); resetForm(); };
  const handleEdit = (d: Deal) => { setForm({ name: d.name, leadId: '', accountId: d.accountId || '', contactId: d.contactId || '', stage: d.stage, value: d.value, probability: d.probability, expectedCloseDate: d.expectedCloseDate }); setEditId(d.id); };
  const handleUpdate = () => { if (editId) { updateDeal(editId, { ...form, accountId: form.accountId || undefined, contactId: form.contactId || undefined }); setEditId(null); resetForm(); } };

  const toggleArchiveSelection = useCallback((dealId: string) => {
    setSelectedForArchive(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  }, []);

  const closedDealsInPipeline = useMemo(() => filtered.filter(d => CLOSED_STAGES.includes(d.stage)), [filtered]);

  const selectAllClosed = useCallback(() => {
    setSelectedForArchive(new Set(closedDealsInPipeline.map(d => d.id)));
  }, [closedDealsInPipeline]);

  const clearSelection = useCallback(() => setSelectedForArchive(new Set()), []);

  const handleBulkArchive = useCallback(async () => {
    await archiveDeals(Array.from(selectedForArchive));
    setSelectedForArchive(new Set());
  }, [selectedForArchive, archiveDeals]);

  const handleDragStart = useCallback((e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dealId);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1';
    setDraggedDealId(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(stage);
  }, []);

  const handleDragLeave = useCallback(() => setDropTarget(null), []);

  const handleDrop = useCallback((e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId) {
      const deal = deals.find(d => d.id === dealId);
      if (deal && deal.stage !== targetStage) handleStageChange(dealId, deal.stage, targetStage);
    }
    setDraggedDealId(null);
    setDropTarget(null);
  }, [deals, handleStageChange]);

  const activeStageDeals = useMemo(() => deals.filter(d => !CLOSED_STAGES.includes(d.stage)), [deals]);
  const totalPipeline = activeStageDeals.reduce((s, d) => s + d.value, 0);
  const weightedPipeline = activeStageDeals.reduce((s, d) => s + d.value * d.probability / 100, 0);

  const analytics = useMemo(() => {
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const lostDeals = deals.filter(d => d.stage === 'closed_lost');
    const totalRevenue = wonDeals.reduce((s, d) => s + d.value, 0);
    const winRate = wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
    const avgDealSize = wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0;

    const stageDistribution = STAGES.map(s => ({
      name: s.label,
      value: deals.filter(d => d.stage === s.value).length,
    })).filter(s => s.value > 0);

    const monthlyData: { month: string; won: number; lost: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthDeals = deals.filter(deal => {
        const dealDate = new Date(deal.updatedAt || deal.createdAt);
        return dealDate.getMonth() === d.getMonth() && dealDate.getFullYear() === d.getFullYear();
      });
      monthlyData.push({
        month: format(d, 'MMM'),
        won: monthDeals.filter(deal => deal.stage === 'closed_won').reduce((s, deal) => s + deal.value, 0),
        lost: monthDeals.filter(deal => deal.stage === 'closed_lost').reduce((s, deal) => s + deal.value, 0),
      });
    }

    const valueByStage = STAGES.map(s => ({
      stage: s.label,
      value: deals.filter(d => d.stage === s.value).reduce((sum, d) => sum + d.value, 0),
    }));

    const lostReasons = lostDeals
      .filter(d => d.lostReason)
      .reduce<Record<string, number>>((acc, d) => {
        const reason = d.lostReason || 'No reason';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
    const topLostReasons = Object.entries(lostReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    return { wonDeals, lostDeals, totalRevenue, winRate, avgDealSize, stageDistribution, monthlyData, valueByStage, topLostReasons };
  }, [deals]);

  const openDetail = (d: Deal) => setSelectedDeal(d);
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Deal Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} /></div>
            <div><Label>Probability (%)</Label><Input type="number" min={0} max={100} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))} /></div>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as DealStage }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Expected Close Date</Label><Input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} /></div>
          <div>
            <Label>Lead (parent pursuit) *</Label>
            <Select value={form.leadId || 'none'} onValueChange={v => {
              const lead = leads.find(l => l.id === v);
              setForm(f => ({ ...f, leadId: v === 'none' ? '' : v, accountId: (lead as any)?.accountId || f.accountId }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
              <SelectContent><SelectItem value="none">No lead</SelectItem>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}{l.company ? ` — ${l.company}` : ''}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">A deal must belong to a lead. Account is auto-derived.</p>
          </div>
          <div>
            <Label>Account</Label>
            <Select value={form.accountId || 'none'} onValueChange={v => setForm(f => ({ ...f, accountId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Auto from lead" /></SelectTrigger>
              <SelectContent><SelectItem value="none">No account</SelectItem>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contact</Label>
            <Select value={form.contactId || 'none'} onValueChange={v => setForm(f => ({ ...f, contactId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
              <SelectContent><SelectItem value="none">No contact</SelectItem>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.name.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderDealCard = (d: Deal) => {
    const stageInfo = STAGES.find(s => s.value === d.stage);
    return (
      <Card key={d.id} className={`hover:shadow-md transition-shadow cursor-pointer ${currentSelected?.id === d.id ? 'ring-2 ring-primary' : ''}`} onClick={() => openDetail(d)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="font-semibold text-sm min-w-0 truncate">{d.name}</p>
            <Badge className={stageInfo?.color}>{stageInfo?.label}</Badge>
          </div>
          <p className="text-lg font-bold text-primary">${d.value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Probability: {d.probability}%</p>
          {d.accountName && <p className="text-xs text-muted-foreground">{d.accountName}</p>}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><UserCircle className="h-3 w-3" />Owner: {getOwnerName(d.ownerId)} · {getOwnerRole(d.ownerId)}</p>
          {d.lostReason && <p className="text-xs text-destructive mt-1">Lost: {d.lostReason}</p>}
          <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(d)}><Pencil className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="-m-4 md:-m-6 flex h-[calc(100%+2rem)] md:h-[calc(100%+3rem)] w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] overflow-hidden p-3 animate-fade-in">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSelectedForArchive(new Set()); }} className="flex-shrink-0">
          <div className="mb-2 flex flex-shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-tight">Deals</h1>
              <p className="text-xs text-muted-foreground">Pipeline: <span className="font-semibold text-foreground">{formatCurrency(totalPipeline)}</span> · Weighted: <span className="font-semibold text-foreground">{formatCurrency(weightedPipeline)}</span></p>
            </div>
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="active" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Active ({deals.length})</TabsTrigger>
              <TabsTrigger value="archived" className="gap-1.5"><Archive className="h-3.5 w-3.5" />Archived ({archivedDealsFromDb.length})</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
            </TabsList>
            <Button onClick={() => setShowAdd(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Deal</Button>
          </div>
        </Tabs>

        {activeTab === 'active' && (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-3 flex flex-shrink-0 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-1">
                <Button variant={viewMode === 'pipeline' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('pipeline')}>Pipeline</Button>
                <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>List</Button>
              </div>
            </div>

            {closedDealsInPipeline.length > 0 && viewMode === 'pipeline' && (
              <div className="mb-3 flex flex-shrink-0 items-center gap-2 rounded-lg border bg-muted/50 p-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{closedDealsInPipeline.length} closed deal(s) in pipeline</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAllClosed}>Select All</Button>
                {selectedForArchive.size > 0 && (
                  <>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearSelection}>Clear</Button>
                    <Button variant="destructive" size="sm" className="ml-auto h-6 gap-1 text-xs" onClick={handleBulkArchive}>
                      <Trash2 className="h-3 w-3" />Archive {selectedForArchive.size} deal(s)
                    </Button>
                  </>
                )}
              </div>
            )}

            {viewMode === 'pipeline' ? (
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
                <div className="grid h-full min-w-[1080px] grid-cols-6 gap-2 pb-1">
                  {STAGES.map(stage => {
                    const stageDeals = filtered.filter(d => d.stage === stage.value);
                    const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
                    const isOver = dropTarget === stage.value && draggedDealId !== null;
                    const isClosed = CLOSED_STAGES.includes(stage.value);

                    return (
                      <div
                        key={stage.value}
                        className={cn('flex min-h-0 min-w-0 flex-col rounded-lg bg-muted/30 p-2 transition-colors', isOver && 'bg-primary/10 ring-2 ring-primary/30')}
                        onDragOver={(e) => handleDragOver(e, stage.value)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage.value)}
                      >
                        <div className="mb-2 px-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`rounded px-2 py-1 text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                            <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(stageTotal)}</p>
                        </div>

                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                          {stageDeals.map(d => (
                            <Card
                              key={d.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, d.id)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                'cursor-grab transition-all hover:shadow-md active:cursor-grabbing',
                                currentSelected?.id === d.id && 'ring-2 ring-primary',
                                draggedDealId === d.id && 'opacity-50',
                                selectedForArchive.has(d.id) && 'ring-2 ring-destructive'
                              )}
                              onClick={() => openDetail(d)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                  {isClosed && (
                                    <div className="mt-0.5 flex-shrink-0" onClick={e => { e.stopPropagation(); toggleArchiveSelection(d.id); }}>
                                      <Checkbox checked={selectedForArchive.has(d.id)} />
                                    </div>
                                  )}
                                  <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{d.name}</p>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1 text-sm font-semibold text-primary"><DollarSign className="h-3 w-3" />{d.value.toLocaleString()}</span>
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3" />{d.probability}%</span>
                                    </div>
                                    {d.accountName && <p className="mt-1 truncate text-xs text-muted-foreground">{d.accountName}</p>}
                                    {d.expectedCloseDate && <p className="text-xs text-muted-foreground">Close: {d.expectedCloseDate}</p>}
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><UserCircle className="h-3 w-3" />{getOwnerName(d.ownerId)}</p>
                                    {d.lostReason && <p className="mt-0.5 truncate text-xs text-destructive">Lost: {d.lostReason}</p>}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto pb-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map(renderDealCard)}
              </div>
            )}
          </section>
        )}

        {activeTab === 'archived' && (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search archived deals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>

            <div className="mb-4 grid flex-shrink-0 grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10"><Trophy className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{archivedDealsFromDb.filter(d => d.stage === 'closed_won').length}</p>
                    <p className="text-xs text-muted-foreground">Won · {formatCurrency(archivedDealsFromDb.filter(d => d.stage === 'closed_won').reduce((s, d) => s + d.value, 0))}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10"><XCircle className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{archivedDealsFromDb.filter(d => d.stage === 'closed_lost').length}</p>
                    <p className="text-xs text-muted-foreground">Lost · {formatCurrency(archivedDealsFromDb.filter(d => d.stage === 'closed_lost').reduce((s, d) => s + d.value, 0))}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {filtered.length > 0 ? (
              <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto pb-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map(renderDealCard)}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Archive className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No archived deals found</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto pb-4">
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{deals.length}</p>
                  <p className="text-xs text-muted-foreground">Total Deals</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.winRate}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(analytics.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Revenue (Won)</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(analytics.avgDealSize)}</p>
                  <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                </CardContent></Card>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-semibold text-foreground">Won vs Lost (6 months)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.monthlyData}>
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="won" name="Won" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="lost" name="Lost" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-semibold text-foreground">Deal Distribution by Stage</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={analytics.stageDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                          {analytics.stageDistribution.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-semibold text-foreground">Pipeline Value by Stage</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.valueByStage} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={100} />
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-semibold text-foreground">Top Reasons for Lost Deals</h3>
                    {analytics.topLostReasons.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.topLostReasons.map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <p className="mr-2 flex-1 truncate text-sm text-foreground">{r.reason}</p>
                            <Badge variant="secondary">{r.count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">No lost deals with reasons recorded yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
      </div>

      {currentSelected && (
        <div className="w-96 border-l bg-card flex-shrink-0 ml-4">
          <EntityDetailPanel entityType="deal" entityId={currentSelected.id} entityName={currentSelected.name} onClose={() => setSelectedDeal(null)}>
            <div className="space-y-1 text-sm">
              <p className="text-lg font-bold text-primary">${currentSelected.value.toLocaleString()}</p>
              <p className="text-muted-foreground">Stage: {STAGES.find(s => s.value === currentSelected.stage)?.label}</p>
              <p className="text-muted-foreground">Probability: {currentSelected.probability}%</p>
              {currentSelected.accountName && <p className="text-muted-foreground">Account: {currentSelected.accountName}</p>}
              {currentSelected.contactName && <p className="text-muted-foreground">Contact: {currentSelected.contactName}</p>}
              <p className="text-muted-foreground flex items-center gap-1"><UserCircle className="h-3 w-3" />Owner: {getOwnerName(currentSelected.ownerId)} ({getOwnerRole(currentSelected.ownerId)})</p>
              {currentSelected.lostReason && (
                <p className="text-destructive font-medium">Lost Reason: {currentSelected.lostReason}</p>
              )}

              {stageHistory.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="font-semibold text-foreground mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Stage History</p>
                  <div className="relative pl-5 space-y-3">
                    <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                    {stageHistory.map((h) => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                        <div>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium text-foreground">{getStageName(h.fromStage)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">{getStageName(h.toStage)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(h.createdAt), 'MMM d, yyyy h:mm a')}
                            {h.changedBy && ` · ${getOwnerName(h.changedBy)}`}
                          </p>
                          {h.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{h.note}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </EntityDetailPanel>
        </div>
      )}

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Deal')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Deal')}
      <ConfirmDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }} title="Delete Deal" description="Are you sure you want to delete this deal?" onConfirm={() => { if (deleteId) { deleteDeal(deleteId); setDeleteId(null); } }} />

      <Dialog open={!!lostReasonDialog} onOpenChange={o => { if (!o) { setLostReasonDialog(null); setLostReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Why was this deal lost?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Please provide a reason for marking this deal as lost.</p>
            <div>
              <Label>Reason *</Label>
              <Textarea value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="e.g. Budget constraints, Chose competitor, Timing not right..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLostReasonDialog(null); setLostReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleLostReasonSubmit} disabled={!lostReason.trim()}>Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
