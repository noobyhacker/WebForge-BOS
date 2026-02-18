import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Enrollment {
  id: string;
  sequenceId: string;
  sequenceName?: string;
  entityType: string;
  entityId: string;
  status: 'active' | 'completed' | 'cancelled';
  currentStepIndex: number;
  enrolledAt: string;
  completedAt?: string;
  cancelledAt?: string;
  lastStepExecutedAt?: string;
  enrolledBy?: string;
}

export function useFollowUpEnrollments() {
  const { user, isApproved } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = useCallback(async () => {
    if (!user || !isApproved) { setEnrollments([]); setLoading(false); return; }
    const { data } = await supabase
      .from('follow_up_sequence_enrollments')
      .select('*, follow_up_sequences(name)')
      .order('enrolled_at', { ascending: false });

    setEnrollments((data || []).map((e: any) => ({
      id: e.id,
      sequenceId: e.sequence_id,
      sequenceName: e.follow_up_sequences?.name || '',
      entityType: e.entity_type,
      entityId: e.entity_id,
      status: e.status,
      currentStepIndex: e.current_step_index,
      enrolledAt: e.enrolled_at,
      completedAt: e.completed_at,
      cancelledAt: e.cancelled_at,
      lastStepExecutedAt: e.last_step_executed_at,
      enrolledBy: e.enrolled_by,
    })));
    setLoading(false);
  }, [user, isApproved]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const enroll = useCallback(async (sequenceId: string, entityType: string, entityId: string) => {
    if (!user) return;
    // Prevent duplicate active enrollments
    const { data: existing } = await supabase
      .from('follow_up_sequence_enrollments')
      .select('id')
      .eq('sequence_id', sequenceId)
      .eq('entity_id', entityId)
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) return; // Already enrolled

    await supabase.from('follow_up_sequence_enrollments').insert({
      sequence_id: sequenceId,
      entity_type: entityType,
      entity_id: entityId,
      enrolled_by: user.id,
    });

    // Emit domain event
    await supabase.from('domain_events').insert({
      event_type: 'automation.executed',
      entity_type: entityType,
      entity_id: entityId,
      actor_id: user.id,
      actor_type: 'user',
      payload: { action: 'enrollment_created', sequence_id: sequenceId },
    });

    await fetchEnrollments();
  }, [user, fetchEnrollments]);

  const cancel = useCallback(async (id: string) => {
    await supabase.from('follow_up_sequence_enrollments').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    }).eq('id', id);
    await fetchEnrollments();
  }, [fetchEnrollments]);

  return { enrollments, loading, enroll, cancel, refetch: fetchEnrollments };
}
