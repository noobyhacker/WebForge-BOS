import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { Plus, CheckCircle2, Clock, AlertTriangle, Filter, Trash2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { ConfirmDialog } from './ConfirmDialog';

const STATUS_OPTIONS = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

const statusColors: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  blocked: 'bg-destructive/10 text-destructive',
  done: 'bg-success/10 text-success',
};

export function TasksView() {
  const { user, isAdmin, isSalesManager } = useAuth();
  const canManageAll = isAdmin || isSalesManager;
  const { tasks, addTask, updateTask, completeTask, deleteTask } = useTasks();
  const { profiles, getOwnerName } = useProfilesMap();
  const navigate = useNavigate();

  const ENTITY_ROUTE: Record<string, string> = {
    client: '/clients', lead: '/clients', contact: '/contacts',
    account: '/accounts', deal: '/deals',
  };
  const openRelated = (t: Task) => {
    if (!t.relatedEntityType || !t.relatedEntityId) return;
    const path = ENTITY_ROUTE[t.relatedEntityType];
    if (path) navigate(`${path}?selected=${t.relatedEntityId}`);
  };
  const [showCreate, setShowCreate] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });

  const allUsers = useMemo(() => {
    const entries: { id: string; name: string }[] = [];
    profiles.forEach((p, id) => entries.push({ id, name: p.fullName }));
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles]);

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && t.assignedTo !== filterAssignee) return false;
    return true;
  });

  // Completion stats per user
  const userStats = useMemo(() => {
    const stats = new Map<string, { total: number; done: number; overdue: number }>();
    tasks.forEach(t => {
      const s = stats.get(t.assignedTo) || { total: 0, done: 0, overdue: 0 };
      s.total++;
      if (t.status === 'done') s.done++;
      else if (t.dueDate && isPast(new Date(t.dueDate))) s.overdue++;
      stats.set(t.assignedTo, s);
    });
    return stats;
  }, [tasks]);

  const handleCreate = async () => {
    if (!user || !form.title.trim()) return;
    await addTask({
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assignedTo: form.assignedTo || user.id,
    });
    setShowCreate(false);
    setForm({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
  };

  const isOverdue = (t: Task) => t.status !== 'done' && t.dueDate && isPast(new Date(t.dueDate));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Operational accountability tied to revenue objects.</p>
        </div>
        <div className="flex gap-2">
          {canManageAll && (
            <Button variant="outline" size="sm" onClick={() => setShowStats(s => !s)} className="gap-1">
              <BarChart3 className="h-4 w-4" /> Stats
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)} className="gap-1" size="sm">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </div>

      {/* Completion Stats (admin/manager only) */}
      {showStats && canManageAll && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Task Completion by User</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {allUsers.filter(u => userStats.has(u.id)).map(u => {
                const s = userStats.get(u.id)!;
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <div key={u.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="font-medium truncate flex-1">{u.name}</span>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-muted-foreground">{s.done}/{s.total} done</span>
                      {s.overdue > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{s.overdue} overdue</Badge>}
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                );
              })}
              {!allUsers.some(u => userStats.has(u.id)) && (
                <div className="px-4 py-4 text-center text-sm text-muted-foreground">No task data yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManageAll && (
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map(task => (
            <Card
              key={task.id}
              className={cn(
                isOverdue(task) && 'border-destructive/50',
                task.relatedEntityId && 'cursor-pointer hover:border-primary/50 transition-colors'
              )}
              onClick={() => openRelated(task)}
              role={task.relatedEntityId ? 'button' : undefined}
              title={task.relatedEntityId ? `Open related ${task.relatedEntityType}` : undefined}
            >
              <CardContent
                className="py-3 px-4 flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {task.status !== 'done' ? (
                  <button onClick={() => completeTask(task.id)} className="flex-shrink-0 text-muted-foreground hover:text-success transition-colors">
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium truncate text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px]', statusColors[task.status])}>{task.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className={cn('text-[10px]', priorityColors[task.priority])}>{task.priority}</Badge>
                    {task.dueDate && (
                      <span className={cn('text-xs flex items-center gap-1', isOverdue(task) ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                        {isOverdue(task) && <AlertTriangle className="h-3 w-3" />}
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">→ {getOwnerName(task.assignedTo)}</span>
                  </div>
                </div>
                <Select value={task.status} onValueChange={(v) => updateTask(task.id, { status: v })}>
                  <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(task.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            {canManageAll && (
              <div>
                <Label>Assign To</Label>
                <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Assign to user..." /></SelectTrigger>
                  <SelectContent>
                    {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={!form.title.trim()}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Task"
        description="This task will be soft-deleted and can be restored from Trash."
        onConfirm={() => { if (deleteId) deleteTask(deleteId); setDeleteId(null); }}
      />
    </div>
  );
}
