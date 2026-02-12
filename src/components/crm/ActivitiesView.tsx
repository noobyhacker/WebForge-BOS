import { useState } from 'react';
import { Activity, ActivityType, ActivityStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CheckCircle2, Clock, Phone, Mail, Users, ListTodo, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { format } from 'date-fns';

const typeIcons: Record<ActivityType, typeof Phone> = { call: Phone, email: Mail, meeting: Users, task: ListTodo };

interface ActivitiesViewProps {
  activities: Activity[];
  onAdd: (activity: Omit<Activity, 'id' | 'createdAt' | 'ownerId' | 'entityName'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Activity>) => void;
  onDelete: (id: string) => void;
}

export function ActivitiesView({ activities, onAdd, onUpdate, onDelete }: ActivitiesViewProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState({ type: 'task' as ActivityType, subject: '', description: '', entityType: '', entityId: '', dueDate: '', status: 'pending' as ActivityStatus, completedAt: undefined as string | undefined });

  const filtered = activities.filter(a => {
    const matchSearch = `${a.subject} ${a.description}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const resetForm = () => setForm({ type: 'task', subject: '', description: '', entityType: '', entityId: '', dueDate: '', status: 'pending', completedAt: undefined });

  const handleAdd = async () => { await onAdd(form); setShowAdd(false); resetForm(); };

  const handleEdit = (a: Activity) => {
    setForm({ type: a.type, subject: a.subject, description: a.description, entityType: a.entityType, entityId: a.entityId, dueDate: a.dueDate ? a.dueDate.slice(0, 16) : '', status: a.status, completedAt: a.completedAt });
    setEditId(a.id);
  };

  const handleUpdate = () => { if (editId) { onUpdate(editId, form); setEditId(null); resetForm(); } };

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ActivityType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><Label>Due Date</Label><Input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ActivityStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.subject.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground">Tasks, calls, emails, and meetings.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Activity</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(a => {
            const Icon = typeIcons[a.type];
            return (
              <Card key={a.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${a.status === 'completed' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                    {a.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Icon className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${a.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{a.subject}</p>
                    {a.description && <p className="text-xs text-muted-foreground truncate">{a.description}</p>}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{a.type}</Badge>
                      {a.dueDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.dueDate), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {a.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => onUpdate(a.id, { status: 'completed' })} title="Mark complete">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No activities found</p>
        </div>
      )}

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Activity')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Activity')}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => { if (!o) setDeleteId(null); }}
        title="Delete Activity"
        description="Are you sure you want to delete this activity?"
        onConfirm={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
