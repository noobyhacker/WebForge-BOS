import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useContacts() {
  const { user, isApproved } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user || !isApproved) { setContacts([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, accounts(name)')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching contacts:', error); return; }
      setContacts((data || []).map((c: any) => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name || '',
        email: c.email || '',
        phone: c.phone || '',
        accountId: c.account_id || undefined,
        accountName: c.accounts?.name || '',
        ownerId: c.owner_id,
        status: c.status,
        source: c.source || '',
        title: c.title || '',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const addContact = useCallback(async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'accountName'>) => {
    if (!user) return;
    const { error } = await supabase.from('contacts').insert({
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      account_id: contact.accountId || null,
      owner_id: user.id,
      status: contact.status,
      source: contact.source,
      title: contact.title,
    });
    if (error) { console.error('Error adding contact:', error); throw error; }
    await fetchContacts();
  }, [user, fetchContacts]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    const { error } = await supabase.from('contacts').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating contact:', error); return; }
    await fetchContacts();
  }, [user, fetchContacts]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) { console.error('Error deleting contact:', error); return; }
    await fetchContacts();
  }, [user, fetchContacts]);

  return { contacts, loading, addContact, updateContact, deleteContact, refetch: fetchContacts };
}
