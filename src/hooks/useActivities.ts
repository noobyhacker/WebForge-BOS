import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ActivityType, ActivityStatus } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useActivities() {
  const { user, isApproved } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!user || !isApproved) { setActivities([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching activities:', error); return; }
      setActivities((data || []).map((a: any) => ({
        id: a.id,
        type: a.type as ActivityType,
        subject: a.subject,
        description: a.description || '',
        entityType: a.entity_type || '',
        entityId: a.entity_id || '',
        ownerId: a.owner_id,
        dueDate: a.due_date || '',
        completedAt: a.completed_at || undefined,
        status: a.status as ActivityStatus,
        createdAt: a.created_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'createdAt' | 'ownerId' | 'entityName'>) => {
    if (!user) return;
    // account_id is auto-filled by DB trigger from entity_type/entity_id (or lead/contact/deal FKs)
    const insertRow: any = {
      type: activity.type,
      subject: activity.subject,
      description: activity.description,
      entity_type: activity.entityType,
      entity_id: activity.entityId || null,
      owner_id: user.id,
      due_date: activity.dueDate || null,
      status: activity.status,
    };
    const { error } = await supabase.from('activities').insert(insertRow);
    if (error) { console.error('Error adding activity:', error); throw error; }
    await fetchActivities();
  }, [user, fetchActivities]);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      if (updates.status === 'completed') dbUpdates.completed_at = new Date().toISOString();
    }
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt || null;
    const { error } = await supabase.from('activities').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating activity:', error); return; }
    await fetchActivities();
  }, [user, fetchActivities]);

  const deleteActivity = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) { console.error('Error deleting activity:', error); return; }
    await fetchActivities();
  }, [user, fetchActivities]);

  return { activities, loading, addActivity, updateActivity, deleteActivity, refetch: fetchActivities };
}
