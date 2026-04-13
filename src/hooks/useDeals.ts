import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Deal, DealStage } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useDeals() {
  const { user, isApproved } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const mapDeal = (d: any): Deal => ({
    id: d.id,
    name: d.name,
    accountId: d.account_id || undefined,
    accountName: d.accounts?.name || '',
    contactId: d.contact_id || undefined,
    contactName: d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}`.trim() : '',
    ownerId: d.owner_id,
    stage: d.stage as DealStage,
    value: Number(d.value) || 0,
    probability: d.probability || 0,
    expectedCloseDate: d.expected_close_date || '',
    lostReason: d.lost_reason || '',
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  });

  const fetchDeals = useCallback(async () => {
    if (!user || !isApproved) { setDeals([]); setArchivedDeals([]); setLoading(false); return; }
    try {
      // Active deals (not soft-deleted)
      const { data, error } = await supabase
        .from('deals')
        .select('*, accounts(name), contacts(first_name, last_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching deals:', error); return; }
      setDeals((data || []).map(mapDeal));

      // Archived deals (soft-deleted, closed_won or closed_lost)
      const { data: archData, error: archError } = await supabase
        .from('deals')
        .select('*, accounts(name), contacts(first_name, last_name)')
        .not('deleted_at', 'is', null)
        .in('stage', ['closed_won', 'closed_lost'])
        .order('updated_at', { ascending: false });
      if (archError) { console.error('Error fetching archived deals:', archError); return; }
      setArchivedDeals((archData || []).map(mapDeal));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const addDeal = useCallback(async (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'accountName' | 'contactName'>) => {
    if (!user) return;
    const { error } = await supabase.from('deals').insert({
      name: deal.name,
      account_id: deal.accountId || null,
      contact_id: deal.contactId || null,
      owner_id: user.id,
      stage: deal.stage,
      value: deal.value,
      probability: deal.probability,
      expected_close_date: deal.expectedCloseDate || null,
    });
    if (error) { console.error('Error adding deal:', error); throw error; }
    await fetchDeals();
  }, [user, fetchDeals]);

  const updateDeal = useCallback(async (id: string, updates: Partial<Deal>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId || null;
    if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId || null;
    if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.probability !== undefined) dbUpdates.probability = updates.probability;
    if (updates.expectedCloseDate !== undefined) dbUpdates.expected_close_date = updates.expectedCloseDate || null;
    if (updates.lostReason !== undefined) dbUpdates.lost_reason = updates.lostReason;
    const { error } = await supabase.from('deals').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating deal:', error); return; }
    await fetchDeals();
  }, [user, fetchDeals]);

  const deleteDeal = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('deals').update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', id);
    if (error) { console.error('Error deleting deal:', error); return; }
    await fetchDeals();
  }, [user, fetchDeals]);

  const archiveDeals = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    for (const id of ids) {
      await supabase.from('deals').update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', id);
    }
    await fetchDeals();
  }, [user, fetchDeals]);

  const bulkImportDeals = useCallback(async (rows: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'accountName' | 'contactName'>[]) => {
    if (!user) return;
    const inserts = rows.map(r => ({
      name: r.name,
      account_id: r.accountId || null,
      contact_id: r.contactId || null,
      owner_id: user.id,
      stage: r.stage || 'prospecting',
      value: r.value || 0,
      probability: r.probability || 0,
      expected_close_date: r.expectedCloseDate || null,
    }));
    const { error } = await supabase.from('deals').insert(inserts);
    if (error) { console.error('Error bulk importing deals:', error); throw error; }
    await fetchDeals();
  }, [user, fetchDeals]);

  return { deals, archivedDeals, loading, addDeal, updateDeal, deleteDeal, archiveDeals, bulkImportDeals, refetch: fetchDeals };
}
