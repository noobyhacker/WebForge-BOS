import { useState } from 'react';
import { usePipelineStages, PipelineStage } from '@/hooks/usePipelineStages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Pencil, Trophy, XCircle } from 'lucide-react';

export function PipelineStagesView() {
  const { stages, addStage, updateStage, softDeleteStage, loading } = usePipelineStages();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3b82f6', isWon: false, isLost: false });

  const resetForm = () => setForm({ name: '', color: '#3b82f6', isWon: false, isLost: false });

  const handleAdd = async () => {
    try {
      await addStage({
        name: form.name,
        color: form.color,
        sortOrder: stages.length,
        isActive: true,
        isWon: form.isWon,
        isLost: form.isLost,
      });
      setShowAdd(false);
      resetForm();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = (s: PipelineStage) => {
    setForm({ name: s.name, color: s.color, isWon: s.isWon, isLost: s.isLost });
    setEditId(s.id);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    await updateStage(editId, { name: form.name, color: form.color, isWon: form.isWon, isLost: form.isLost });
    setEditId(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    try {
      await softDeleteStage(id);
      toast({ title: 'Stage deleted' });
    } catch (e: any) {
      toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' });
    }
  };

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Stage Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Color</Label><Input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-20" /></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.isWon} onCheckedChange={v => setForm(f => ({ ...f, isWon: v, isLost: v ? false : f.isLost }))} />
              <Label className="flex items-center gap-1"><Trophy className="h-3 w-3" /> Won stage</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isLost} onCheckedChange={v => setForm(f => ({ ...f, isLost: v, isWon: v ? false : f.isWon }))} />
              <Label className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Lost stage</Label>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.name.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Stages</h1>
          <p className="text-muted-foreground">Configure deal pipeline stages.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Stage</Button>
      </div>

      <div className="space-y-2">
        {stages.map((s, i) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="h-6 w-6 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1">
                <p className="font-medium text-sm">{s.name}</p>
                <div className="flex gap-2 mt-0.5">
                  {s.isWon && <span className="text-xs text-green-600 flex items-center gap-0.5"><Trophy className="h-3 w-3" />Won</span>}
                  {s.isLost && <span className="text-xs text-destructive flex items-center gap-0.5"><XCircle className="h-3 w-3" />Lost</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Stage')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Stage')}
    </div>
  );
}
