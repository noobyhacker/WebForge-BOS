import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useKpis, Kpi, KPI_CATEGORIES, KPI_UNITS, KPI_FREQUENCIES } from '@/hooks/useKpis';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Pencil, Trash2, Target, TrendingUp, TrendingDown, Minus,
  DollarSign, Percent, Clock, Hash, CalendarDays, BarChart3,
  ArrowUpRight, ArrowDownRight, Search, UserCircle,
} from 'lucide-react';

function formatValue(value: number, unit: string) {
  switch (unit) {
    case 'currency': return `$${value.toLocaleString()}`;
    case 'percentage': return `${value}%`;
    case 'hours': return `${value}h`;
    case 'days': return `${value}d`;
    default: return value.toLocaleString();
  }
}

function getUnitIcon(unit: string) {
  switch (unit) {
    case 'currency': return DollarSign;
    case 'percentage': return Percent;
    case 'hours': case 'days': return Clock;
    default: return Hash;
  }
}

function getProgress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

function getProgressColor(progress: number) {
  if (progress >= 90) return 'text-[hsl(var(--success))]';
  if (progress >= 60) return 'text-[hsl(var(--warning))]';
  return 'text-destructive';
}

const EMPTY_FORM = {
  name: '', description: '', category: 'general', unit: 'number',
  targetValue: 0, currentValue: 0, frequency: 'monthly', isActive: true,
  assignedTo: '' as string,
};

export function KpisView() {
  const { kpis, loading, addKpi, updateKpi, deleteKpi } = useKpis();
  const { profiles, getOwnerName } = useProfilesMap();
  const { isAdmin, isSalesManager } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const filtered = useMemo(() => {
    let result = kpis;
    if (search) result = result.filter(k => k.name.toLowerCase().includes(search.toLowerCase()));
    if (filterCategory !== 'all') result = result.filter(k => k.category === filterCategory);
    return result;
  }, [kpis, search, filterCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, Kpi[]> = {};
    for (const kpi of filtered) {
      if (!groups[kpi.category]) groups[kpi.category] = [];
      groups[kpi.category].push(kpi);
    }
    return groups;
  }, [filtered]);

  const summary = useMemo(() => {
    const active = kpis.filter(k => k.isActive);
    const onTrack = active.filter(k => getProgress(k.currentValue, k.targetValue) >= 70).length;
    const atRisk = active.filter(k => {
      const p = getProgress(k.currentValue, k.targetValue);
      return p >= 40 && p < 70;
    }).length;
    const offTrack = active.filter(k => getProgress(k.currentValue, k.targetValue) < 40).length;
    return { total: active.length, onTrack, atRisk, offTrack };
  }, [kpis]);

  const openCreate = () => { setEditingKpi(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (kpi: Kpi) => {
    setEditingKpi(kpi);
    setForm({
      name: kpi.name, description: kpi.description, category: kpi.category,
      unit: kpi.unit, targetValue: kpi.targetValue, currentValue: kpi.currentValue,
      frequency: kpi.frequency, isActive: kpi.isActive, assignedTo: kpi.assignedTo || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null };
      if (editingKpi) {
        await updateKpi(editingKpi.id, payload);
        toast({ title: 'KPI updated' });
      } else {
        await addKpi(payload);
        toast({ title: 'KPI created' });
      }
      setDialogOpen(false);
    } catch { toast({ title: 'Error saving KPI', variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteKpi(id); toast({ title: 'KPI deleted' }); }
    catch { toast({ title: 'Error deleting', variant: 'destructive' }); }
  };

  const categoryLabel = (cat: string) => KPI_CATEGORIES.find(c => c.value === cat)?.label || cat;

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading KPIs...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground">Track key performance indicators across your business.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New KPI</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingKpi ? 'Edit KPI' : 'Create KPI'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Revenue" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this KPI measure?" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KPI_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KPI_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input type="number" value={form.targetValue} onChange={e => setForm({ ...form, targetValue: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Current Value</Label>
                  <Input type="number" value={form.currentValue} onChange={e => setForm({ ...form, currentValue: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KPI_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editingKpi ? 'Update KPI' : 'Create KPI'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Active KPIs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-[hsl(var(--success))]" />
            <p className="text-2xl font-bold text-[hsl(var(--success))]">{summary.onTrack}</p>
            <p className="text-xs text-muted-foreground">On Track</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Minus className="h-5 w-5 mx-auto mb-1 text-[hsl(var(--warning))]" />
            <p className="text-2xl font-bold text-[hsl(var(--warning))]">{summary.atRisk}</p>
            <p className="text-xs text-muted-foreground">At Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingDown className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{summary.offTrack}</p>
            <p className="text-xs text-muted-foreground">Off Track</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search KPIs..." className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {KPI_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No KPIs found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Create your first KPI to start tracking performance.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{categoryLabel(cat)}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map(kpi => {
                const progress = getProgress(kpi.currentValue, kpi.targetValue);
                const UnitIcon = getUnitIcon(kpi.unit);
                return (
                  <Card key={kpi.id} className={!kpi.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <UnitIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <CardTitle className="text-sm font-medium truncate">{kpi.name}</CardTitle>
                        </div>
                        {kpi.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{kpi.description}</p>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(kpi)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(kpi.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold">{formatValue(kpi.currentValue, kpi.unit)}</p>
                          <p className="text-xs text-muted-foreground">of {formatValue(kpi.targetValue, kpi.unit)} target</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${getProgressColor(progress)}`}>
                          {progress >= 70 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {progress}%
                        </div>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {kpi.frequency}
                        </Badge>
                        {!kpi.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
