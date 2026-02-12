import { useState } from 'react';
import { Deal, DealStage, Account, Contact } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, DollarSign, Trash2, Pencil, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';

const STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { value: 'qualification', label: 'Qualification', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  { value: 'proposal', label: 'Proposal', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
];

interface DealsViewProps {
  deals: Deal[];
  accounts: Account[];
  contacts: Contact[];
  onAdd: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'accountName' | 'contactName'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Deal>) => void;
  onDelete: (id: string) => void;
}

export function DealsView({ deals, accounts, contacts, onAdd, onUpdate, onDelete }: DealsViewProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [form, setForm] = useState({ name: '', accountId: '' as string | undefined, contactId: '' as string | undefined, stage: 'prospecting' as DealStage, value: 0, probability: 20, expectedCloseDate: '' });

  const filtered = deals.filter(d => `${d.name} ${d.accountName} ${d.contactName}`.toLowerCase().includes(search.toLowerCase()));
  const resetForm = () => setForm({ name: '', accountId: '', contactId: '', stage: 'prospecting', value: 0, probability: 20, expectedCloseDate: '' });

  const handleAdd = async () => {
    await onAdd({ ...form, accountId: form.accountId || undefined, contactId: form.contactId || undefined });
    setShowAdd(false);
    resetForm();
  };

  const handleEdit = (d: Deal) => {
    setForm({ name: d.name, accountId: d.accountId || '', contactId: d.contactId || '', stage: d.stage, value: d.value, probability: d.probability, expectedCloseDate: d.expectedCloseDate });
    setEditId(d.id);
  };

  const handleUpdate = () => {
    if (editId) { onUpdate(editId, { ...form, accountId: form.accountId || undefined, contactId: form.contactId || undefined }); setEditId(null); resetForm(); }
  };

  const totalPipeline = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const weightedPipeline = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + d.value * d.probability / 100, 0);

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
            <Label>Account</Label>
            <Select value={form.accountId || 'none'} onValueChange={v => setForm(f => ({ ...f, accountId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No account</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contact</Label>
            <Select value={form.contactId || 'none'} onValueChange={v => setForm(f => ({ ...f, contactId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.name.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">Pipeline: <span className="font-semibold text-foreground">${totalPipeline.toLocaleString()}</span> · Weighted: <span className="font-semibold text-foreground">${weightedPipeline.toLocaleString()}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'pipeline' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('pipeline')}>Pipeline</Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>List</Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Deal</Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {viewMode === 'pipeline' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageDeals = filtered.filter(d => d.stage === stage.value);
            const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.value} className="min-w-[260px] flex-1">
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${stage.color}`}>{stage.label}</span>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">${stageTotal.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  {stageDeals.map(d => (
                    <Card key={d.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEdit(d)}>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate">{d.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold text-primary flex items-center gap-1"><DollarSign className="h-3 w-3" />{d.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />{d.probability}%</span>
                        </div>
                        {d.accountName && <p className="text-xs text-muted-foreground mt-1 truncate">{d.accountName}</p>}
                        {d.expectedCloseDate && <p className="text-xs text-muted-foreground">Close: {d.expectedCloseDate}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => {
            const stageInfo = STAGES.find(s => s.value === d.stage);
            return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm">{d.name}</p>
                    <Badge className={stageInfo?.color}>{stageInfo?.label}</Badge>
                  </div>
                  <p className="text-lg font-bold text-primary">${d.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Probability: {d.probability}%</p>
                  {d.accountName && <p className="text-xs text-muted-foreground">{d.accountName}</p>}
                  <div className="flex gap-1 mt-3">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(d)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Deal')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Deal')}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => { if (!o) setDeleteId(null); }}
        title="Delete Deal"
        description="Are you sure you want to delete this deal?"
        onConfirm={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
