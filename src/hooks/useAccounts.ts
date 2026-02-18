import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Account } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useAccounts() {
  const { user, isApproved } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user || !isApproved) { setAccounts([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching accounts:', error); return; }
      setAccounts((data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        industry: a.industry || '',
        website: a.website || '',
        phone: a.phone || '',
        address: a.address || '',
        ownerId: a.owner_id,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = useCallback(async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    if (!user) return;
    const { error } = await supabase.from('accounts').insert({
      name: account.name,
      industry: account.industry,
      website: account.website,
      phone: account.phone,
      address: account.address,
      owner_id: user.id,
    });
    if (error) { console.error('Error adding account:', error); throw error; }
    await fetchAccounts();
  }, [user, fetchAccounts]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
    if (updates.website !== undefined) dbUpdates.website = updates.website;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    const { error } = await supabase.from('accounts').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating account:', error); return; }
    await fetchAccounts();
  }, [user, fetchAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('accounts').update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', id);
    if (error) { console.error('Error deleting account:', error); return; }
    await fetchAccounts();
  }, [user, fetchAccounts]);

  const bulkImportAccounts = useCallback(async (rows: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>[]) => {
    if (!user) return;
    const inserts = rows.map(r => ({
      name: r.name,
      industry: r.industry || '',
      website: r.website || '',
      phone: r.phone || '',
      address: r.address || '',
      owner_id: user.id,
    }));
    const { error } = await supabase.from('accounts').insert(inserts);
    if (error) { console.error('Error bulk importing accounts:', error); throw error; }
    await fetchAccounts();
  }, [user, fetchAccounts]);

  return { accounts, loading, addAccount, updateAccount, deleteAccount, bulkImportAccounts, refetch: fetchAccounts };
}
