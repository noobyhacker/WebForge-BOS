import { useState, useEffect, useCallback } from 'react';
import { Activity, ActivityType } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Plus } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { NotesList } from './NotesList';
import { EntityCommentsSection } from './EntityCommentsSection';
import { TaskCard } from './TaskCard';
import { useNotes } from '@/hooks/useNotes';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EntityDetailPanelProps {
  entityType: string;
  entityId: string;
  entityName: string;
  onClose: () => void;
  children?: React.ReactNode; // Extra entity info to render at top
}

export function EntityDetailPanel({ entityType, entityId, entityName, onClose, children }: EntityDetailPanelProps) {
  const { user } = useAuth();
  const { notes, addNote, deleteNote } = useNotes(entityType, entityId);
  const { tasks: entityTasks, completeTask, addTask } = useTasks(entityType, entityId);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'task' as ActivityType, subject: '', description: '', dueDate: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  const fetchEntityActivities = useCallback(async () => {
    if (!entityId) return;
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching entity activities:', error); return; }
    setActivities((data || []).map((a: any) => ({
      id: a.id,
      type: a.type,
      subject: a.subject,
      description: a.description || '',
      entityType: a.entity_type || '',
      entityId: a.entity_id || '',
      ownerId: a.owner_id,
      dueDate: a.due_date || '',
      completedAt: a.completed_at || undefined,
      status: a.status,
      createdAt: a.created_at,
    })));
  }, [entityType, entityId]);

  useEffect(() => { fetchEntityActivities(); }, [fetchEntityActivities]);

  const handleAddActivity = async () => {
    if (!user || !activityForm.subject.trim()) return;
    const { error } = await supabase.from('activities').insert({
      type: activityForm.type,
      subject: activityForm.subject,
      description: activityForm.description,
      entity_type: entityType,
      entity_id: entityId,
      owner_id: user.id,
      due_date: activityForm.dueDate || null,
      status: 'pending',
    });
    if (error) { console.error('Error adding activity:', error); return; }
    setShowAddActivity(false);
    setActivityForm({ type: 'task', subject: '', description: '', dueDate: '' });
    await fetchEntityActivities();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b gap-2">
        <h2 className="font-semibold text-lg truncate min-w-0">{entityName}</h2>
        <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* Extra entity info */}
      {children && <div className="p-4 border-b">{children}</div>}

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({entityTasks.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 overflow-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{activities.length} activities</span>
            <Button size="sm" variant="outline" onClick={() => setShowAddActivity(true)} className="gap-1">
              <Plus className="h-3 w-3" />Activity
            </Button>
          </div>
          <ActivityTimeline activities={activities} />
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 overflow-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{entityTasks.length} tasks</span>
            <Button size="sm" variant="outline" onClick={() => setShowAddTask(true)} className="gap-1">
              <Plus className="h-3 w-3" />Task
            </Button>
          </div>
          {entityTasks.length > 0 ? (
            <div className="space-y-2">
              {entityTasks.map(t => <TaskCard key={t.id} task={t} onComplete={completeTask} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No tasks linked to this entity.</p>
          )}
        </TabsContent>

        <TabsContent value="comments" className="flex-1 overflow-auto p-4">
          <EntityCommentsSection entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-auto p-4">
          <NotesList notes={notes} onAdd={addNote} onDelete={deleteNote} />
        </TabsContent>
      </Tabs>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Activity for {entityName}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Type</Label>
              <Select value={activityForm.type} onValueChange={v => setActivityForm(f => ({ ...f, type: v as ActivityType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Subject *</Label><Input value={activityForm.subject} onChange={e => setActivityForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={activityForm.description} onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Due Date</Label><Input type="datetime-local" value={activityForm.dueDate} onChange={e => setActivityForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddActivity} disabled={!activityForm.subject.trim()}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task for {entityName}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="datetime-local" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              if (!user || !taskForm.title.trim()) return;
              await addTask({
                title: taskForm.title,
                description: taskForm.description,
                priority: taskForm.priority,
                dueDate: taskForm.dueDate || null,
                assignedTo: user.id,
                relatedEntityType: entityType,
                relatedEntityId: entityId,
              });
              setShowAddTask(false);
              setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
            }} disabled={!taskForm.title.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
