import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StageHistoryEntry {
  id: string;
  dealId: string;
  fromStage: string;
  toStage: string;
  changedBy: string;
  note: string;
  createdAt: string;
}

export function useDealStageHistory(dealId: string | null) {
  const { user } = useAuth();
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!dealId) { setHistory([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deal_stage_history')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });
      if (error) { console.error('Error fetching stage history:', error); return; }
      setHistory((data || []).map((h: any) => ({
        id: h.id,
        dealId: h.deal_id,
        fromStage: h.from_stage,
        toStage: h.to_stage,
        changedBy: h.changed_by || '',
        note: h.note || '',
        createdAt: h.created_at,
      })));
    } finally { setLoading(false); }
  }, [dealId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addHistoryEntry = useCallback(async (entry: {
    dealId: string;
    fromStage: string;
    toStage: string;
    note?: string;
  }) => {
    if (!user) return;
    const { error } = await supabase.from('deal_stage_history').insert({
      deal_id: entry.dealId,
      from_stage: entry.fromStage,
      to_stage: entry.toStage,
      changed_by: user.id,
      note: entry.note || '',
    });
    if (error) { console.error('Error adding stage history:', error); return; }
    await fetchHistory();
  }, [user, fetchHistory]);

  return { history, loading, addHistoryEntry, refetch: fetchHistory };
}
