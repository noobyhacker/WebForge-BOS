import { useState, useMemo, useCallback } from 'react';
import { Client, FollowUp, DashboardStats, FollowUpStatus, ActionLog, ActionType, EntityType } from '@/types/crm';

export function useClients(userEmail: string = 'anonymous') {
  const [clients, setClients] = useState<Client[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const logAction = useCallback((
    actionType: ActionType,
    entityType: EntityType,
    entityName: string,
    details?: string
  ) => {
    const log: ActionLog = {
      id: Date.now().toString(),
      userEmail,
      actionType,
      entityType,
      entityName,
      details,
      createdAt: new Date().toISOString(),
    };
    setActionLogs((prev) => [log, ...prev]);
  }, [userEmail]);

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

  const addClient = useCallback((client: Omit<Client, 'id' | 'createdAt' | 'followUps'>) => {
    const newClient: Client = {
      ...client,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
      followUps: [],
    };
    setClients((prev) => [...prev, newClient]);
    logAction('create', 'client', newClient.name, `Created client ${newClient.name} (${newClient.company})`);
    return newClient;
  }, [logAction]);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id === id) {
          logAction('update', 'client', client.name, `Updated client ${client.name}`);
          return { ...client, ...updates };
        }
        return client;
      })
    );
  }, [logAction]);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => {
      const client = prev.find((c) => c.id === id);
      if (client) {
        logAction('delete', 'client', client.name, `Deleted client ${client.name}`);
      }
      return prev.filter((c) => c.id !== id);
    });
  }, [logAction]);

  const addFollowUp = useCallback((clientId: string, followUp: Omit<FollowUp, 'id' | 'clientId'>) => {
    const newFollowUp: FollowUp = {
      ...followUp,
      id: Date.now().toString(),
      clientId,
    };
    setClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          logAction('create', 'follow_up', `${followUp.type} for ${client.name}`, followUp.notes);
          return { ...client, followUps: [...client.followUps, newFollowUp] };
        }
        return client;
      })
    );
    return newFollowUp;
  }, [logAction]);

  const updateFollowUpStatus = useCallback((clientId: string, followUpId: string, status: FollowUpStatus) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          const followUp = client.followUps.find((f) => f.id === followUpId);
          if (followUp) {
            logAction('update', 'follow_up', `${followUp.type} for ${client.name}`, `Status changed to ${status}`);
          }
          return {
            ...client,
            followUps: client.followUps.map((f) =>
              f.id === followUpId ? { ...f, status } : f
            ),
          };
        }
        return client;
      })
    );
  }, [logAction]);

  const updateFollowUp = useCallback((clientId: string, followUpId: string, updates: Partial<Omit<FollowUp, 'id' | 'clientId'>>) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          const followUp = client.followUps.find((f) => f.id === followUpId);
          if (followUp) {
            logAction('update', 'follow_up', `${followUp.type} for ${client.name}`, 'Follow-up updated');
          }
          return {
            ...client,
            followUps: client.followUps.map((f) =>
              f.id === followUpId ? { ...f, ...updates } : f
            ),
          };
        }
        return client;
      })
    );
  }, [logAction]);

  const deleteFollowUp = useCallback((clientId: string, followUpId: string) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          const followUp = client.followUps.find((f) => f.id === followUpId);
          if (followUp) {
            logAction('delete', 'follow_up', `${followUp.type} for ${client.name}`, 'Follow-up deleted');
          }
          return {
            ...client,
            followUps: client.followUps.filter((f) => f.id !== followUpId),
          };
        }
        return client;
      })
    );
  }, [logAction]);

  return {
    clients: filteredClients,
    allClients: clients,
    stats,
    upcomingFollowUps,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    addClient,
    updateClient,
    deleteClient,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    updateFollowUpStatus,
  };
}
