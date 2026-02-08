import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Client, FollowUp, DashboardStats, FollowUpStatus, ActionLog, ActionType, EntityType } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useClients(userEmail: string = 'anonymous') {
  const { user, isApproved } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Fetch clients and their follow-ups from database
  const fetchClients = useCallback(async () => {
    if (!user || !isApproved) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
      }

      const { data: followUpsData, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .order('date', { ascending: true });

      if (followUpsError) {
        console.error('Error fetching follow-ups:', followUpsError);
      }

      // Map database records to Client type with embedded follow-ups
      const clientsWithFollowUps: Client[] = (clientsData || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        status: c.status as 'active' | 'inactive' | 'lead',
        createdAt: c.created_at,
        lastContact: c.last_contact,
        notes: c.notes || '',
        userId: c.user_id, // Include owner for permission checks
        followUps: (followUpsData || [])
          .filter((f) => f.client_id === c.id)
          .map((f) => ({
            id: f.id,
            clientId: f.client_id,
            date: f.date,
            notes: f.notes || '',
            status: f.status as FollowUpStatus,
            type: f.type as 'call' | 'email' | 'meeting' | 'task',
          })),
      }));

      setClients(clientsWithFollowUps);
    } catch (error) {
      console.error('Error in fetchClients:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isApproved]);

  // Fetch action logs
  const fetchActionLogs = useCallback(async () => {
    if (!user || !isApproved) {
      setActionLogs([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching action logs:', error);
        return;
      }

      const logs: ActionLog[] = (data || []).map((l) => ({
        id: l.id,
        userEmail: l.user_email,
        actionType: l.action_type as ActionType,
        entityType: l.entity_type as EntityType,
        entityId: l.entity_id || undefined,
        entityName: l.entity_name,
        details: l.details || undefined,
        entityData: l.entity_data || undefined,
        createdAt: l.created_at,
      }));

      setActionLogs(logs);
    } catch (error) {
      console.error('Error in fetchActionLogs:', error);
    }
  }, [user, isApproved]);

  // Load data on mount and when user/approval changes
  useEffect(() => {
    fetchClients();
    fetchActionLogs();
  }, [fetchClients, fetchActionLogs]);

  // Log an action to the database
  const logAction = useCallback(async (
    actionType: ActionType,
    entityType: EntityType,
    entityName: string,
    details?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('action_logs').insert({
        user_id: user.id,
        user_email: userEmail,
        action_type: actionType,
        entity_type: entityType,
        entity_name: entityName,
        details,
      });

      if (error) {
        console.error('Error logging action:', error);
      } else {
        // Refresh logs after insert
        fetchActionLogs();
      }
    } catch (error) {
      console.error('Error in logAction:', error);
    }
  }, [user, userEmail, fetchActionLogs]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const stats: DashboardStats = useMemo(() => {
    const allFollowUps = clients.flatMap((c) => c.followUps);
    return {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.status === 'active').length,
      pendingFollowUps: allFollowUps.filter((f) => f.status === 'pending' || f.status === 'scheduled').length,
      overdueFollowUps: allFollowUps.filter((f) => f.status === 'overdue').length,
    };
  }, [clients]);

  const upcomingFollowUps = useMemo(() => {
    const allFollowUps = clients.flatMap((c) =>
      c.followUps.map((f) => ({
        ...f,
        clientName: c.name,
        clientCompany: c.company,
      }))
    );
    return allFollowUps
      .filter((f) => f.status !== 'completed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [clients]);

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'createdAt' | 'followUps'>) => {
    if (!user) {
      throw new Error('Not authenticated');
    }

    try {
      // IMPORTANT: avoid `.select().single()` on insert because RLS can block RETURNING
      // which makes the insert look like it failed even if it succeeded.
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          status: client.status,
          notes: client.notes,
          last_contact: client.lastContact,
        });

      if (insertError) {
        console.error('Error adding client:', insertError);
        throw new Error(insertError.message);
      }

      await logAction('create', 'client', client.name, `Created client ${client.name} (${client.company})`);
      await fetchClients();

      // Best-effort: fetch latest client for this user so callers can treat as success.
      const { data: latest, error: latestError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        console.warn('Could not fetch newly created client:', latestError);
      }

      return {
        id: latest?.id ?? crypto.randomUUID(),
        name: latest?.name ?? client.name,
        email: latest?.email || client.email || '',
        phone: latest?.phone || client.phone || '',
        company: latest?.company || client.company || '',
        status: (latest?.status as 'active' | 'inactive' | 'lead') ?? client.status,
        createdAt: latest?.created_at ?? new Date().toISOString(),
        lastContact: latest?.last_contact ?? client.lastContact,
        notes: latest?.notes || client.notes || '',
        followUps: [],
      };
    } catch (error) {
      console.error('Error in addClient:', error);
      throw error instanceof Error ? error : new Error('Failed to add client');
    }
  }, [user, logAction, fetchClients]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.lastContact !== undefined) dbUpdates.last_contact = updates.lastContact;

      const { error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Error updating client:', error);
        return;
      }

      const client = clients.find((c) => c.id === id);
      if (client) {
        await logAction('update', 'client', client.name, `Updated client ${client.name}`);
      }
      await fetchClients();
    } catch (error) {
      console.error('Error in updateClient:', error);
    }
  }, [user, clients, logAction, fetchClients]);

  const deleteClient = useCallback(async (id: string) => {
    if (!user) return;

    const client = clients.find((c) => c.id === id);

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting client:', error);
        return;
      }

      if (client) {
        await logAction('delete', 'client', client.name, `Deleted client ${client.name}`);
      }
      await fetchClients();
    } catch (error) {
      console.error('Error in deleteClient:', error);
    }
  }, [user, clients, logAction, fetchClients]);

  const addFollowUp = useCallback(async (clientId: string, followUp: Omit<FollowUp, 'id' | 'clientId'>) => {
    if (!user) return null;

    const client = clients.find((c) => c.id === clientId);

    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({
          client_id: clientId,
          user_id: user.id,
          date: followUp.date,
          notes: followUp.notes,
          status: followUp.status,
          type: followUp.type,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding follow-up:', error);
        return null;
      }

      if (client) {
        await logAction('create', 'follow_up', `${followUp.type} for ${client.name}`, followUp.notes);
      }
      await fetchClients();

      return {
        id: data.id,
        clientId: data.client_id,
        date: data.date,
        notes: data.notes || '',
        status: data.status as FollowUpStatus,
        type: data.type as 'call' | 'email' | 'meeting' | 'task',
      };
    } catch (error) {
      console.error('Error in addFollowUp:', error);
      return null;
    }
  }, [user, clients, logAction, fetchClients]);

  const updateFollowUpStatus = useCallback(async (clientId: string, followUpId: string, status: FollowUpStatus) => {
    if (!user) return;

    const client = clients.find((c) => c.id === clientId);
    const followUp = client?.followUps.find((f) => f.id === followUpId);

    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status })
        .eq('id', followUpId);

      if (error) {
        console.error('Error updating follow-up status:', error);
        return;
      }

      if (client && followUp) {
        await logAction('update', 'follow_up', `${followUp.type} for ${client.name}`, `Status changed to ${status}`);
      }
      await fetchClients();
    } catch (error) {
      console.error('Error in updateFollowUpStatus:', error);
    }
  }, [user, clients, logAction, fetchClients]);

  const updateFollowUp = useCallback(async (clientId: string, followUpId: string, updates: Partial<Omit<FollowUp, 'id' | 'clientId'>>) => {
    if (!user) return;

    const client = clients.find((c) => c.id === clientId);
    const followUp = client?.followUps.find((f) => f.id === followUpId);

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.type !== undefined) dbUpdates.type = updates.type;

      const { error } = await supabase
        .from('follow_ups')
        .update(dbUpdates)
        .eq('id', followUpId);

      if (error) {
        console.error('Error updating follow-up:', error);
        return;
      }

      if (client && followUp) {
        await logAction('update', 'follow_up', `${followUp.type} for ${client.name}`, 'Follow-up updated');
      }
      await fetchClients();
    } catch (error) {
      console.error('Error in updateFollowUp:', error);
    }
  }, [user, clients, logAction, fetchClients]);

  const deleteFollowUp = useCallback(async (clientId: string, followUpId: string) => {
    if (!user) return;

    const client = clients.find((c) => c.id === clientId);
    const followUp = client?.followUps.find((f) => f.id === followUpId);

    try {
      const { error } = await supabase
        .from('follow_ups')
        .delete()
        .eq('id', followUpId);

      if (error) {
        console.error('Error deleting follow-up:', error);
        return;
      }

      if (client && followUp) {
        await logAction('delete', 'follow_up', `${followUp.type} for ${client.name}`, 'Follow-up deleted');
      }
      await fetchClients();
    } catch (error) {
      console.error('Error in deleteFollowUp:', error);
    }
  }, [user, clients, logAction, fetchClients]);

  return {
    clients: filteredClients,
    allClients: clients,
    stats,
    upcomingFollowUps,
    actionLogs,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loading,
    addClient,
    updateClient,
    deleteClient,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    updateFollowUpStatus,
    refetch: fetchClients,
  };
}
