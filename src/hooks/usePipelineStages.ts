import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  isWon: boolean;
  isLost: boolean;
  deletedAt?: string;
}

export function usePipelineStages() {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    setStages((data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sortOrder: s.sort_order,
      isActive: s.is_active,
      isWon: s.is_won,
      isLost: s.is_lost,
      deletedAt: s.deleted_at,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const addStage = useCallback(async (stage: Omit<PipelineStage, 'id' | 'deletedAt'>) => {
    const { error } = await supabase.from('pipeline_stages').insert({
      name: stage.name,
      color: stage.color,
      sort_order: stage.sortOrder,
      is_active: stage.isActive,
      is_won: stage.isWon,
      is_lost: stage.isLost,
    });
    if (error) throw error;
    await fetchStages();
  }, [fetchStages]);

  const updateStage = useCallback(async (id: string, updates: Partial<PipelineStage>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.isWon !== undefined) dbUpdates.is_won = updates.isWon;
    if (updates.isLost !== undefined) dbUpdates.is_lost = updates.isLost;
    await supabase.from('pipeline_stages').update(dbUpdates).eq('id', id);
    await fetchStages();
  }, [fetchStages]);

  const softDeleteStage = useCallback(async (id: string) => {
    if (!user) return;
    // Check if any deals use this stage
    const stage = stages.find(s => s.id === id);
    if (!stage) return;
    const { count } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('stage', stage.name as any)
      .is('deleted_at', null);

    if ((count || 0) > 0) {
      throw new Error(`Cannot delete: ${count} deals use this stage`);
    }

    await supabase.from('pipeline_stages').update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    }).eq('id', id);
    await fetchStages();
  }, [user, stages, fetchStages]);

  const restoreStage = useCallback(async (id: string) => {
    await supabase.from('pipeline_stages').update({ deleted_at: null, deleted_by: null }).eq('id', id);
    await fetchStages();
  }, [fetchStages]);

  return { stages, loading, addStage, updateStage, softDeleteStage, restoreStage, refetch: fetchStages };
}
