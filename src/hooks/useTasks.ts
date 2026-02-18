import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string;
  createdBy: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assignedTo: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

function mapRow(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at,
  };
}

export function useTasks(entityType?: string, entityId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (entityType && entityId) {
      query = query.eq('related_entity_type', entityType).eq('related_entity_id', entityId);
    }

    const { data, error } = await query;
    if (error) { console.error('Error fetching tasks:', error); return; }
    setTasks((data || []).map(mapRow));
    setLoading(false);
  }, [user, entityType, entityId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (input: CreateTaskInput) => {
    if (!user) return;
    const { error } = await supabase.from('tasks').insert({
      title: input.title,
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      due_date: input.dueDate || null,
      assigned_to: input.assignedTo,
      created_by: user.id,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Task created' });
    await fetchTasks();
  };

  const updateTask = async (id: string, updates: Partial<{
    title: string; description: string; status: string; priority: string;
    dueDate: string | null; assignedTo: string;
  }>) => {
    const mapped: any = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.priority !== undefined) mapped.priority = updates.priority;
    if (updates.dueDate !== undefined) mapped.due_date = updates.dueDate;
    if (updates.assignedTo !== undefined) mapped.assigned_to = updates.assignedTo;
    if (updates.status === 'done') mapped.completed_at = new Date().toISOString();

    const { error } = await supabase.from('tasks').update(mapped).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
      return;
    }
    await fetchTasks();
  };

  const completeTask = async (id: string) => {
    await updateTask(id, { status: 'done' });
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('tasks').update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Task deleted' });
    await fetchTasks();
  };

  const myOverdueTasks = useMemo(() =>
    tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()),
  [tasks]);

  const myTasks = useMemo(() =>
    user ? tasks.filter(t => t.assignedTo === user.id) : [],
  [tasks, user]);

  return { tasks, myTasks, myOverdueTasks, loading, addTask, updateTask, completeTask, deleteTask, refetch: fetchTasks };
}
