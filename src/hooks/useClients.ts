import { useState, useMemo, useCallback } from 'react';
import { Client, FollowUp, DashboardStats, FollowUpStatus } from '@/types/crm';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) => (client.id === id ? { ...client, ...updates } : client))
    );
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
  }, []);

  const addFollowUp = useCallback((clientId: string, followUp: Omit<FollowUp, 'id' | 'clientId'>) => {
    const newFollowUp: FollowUp = {
      ...followUp,
      id: Date.now().toString(),
      clientId,
    };
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? { ...client, followUps: [...client.followUps, newFollowUp] }
          : client
      )
    );
    return newFollowUp;
  }, []);

  const updateFollowUpStatus = useCallback((clientId: string, followUpId: string, status: FollowUpStatus) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? {
              ...client,
              followUps: client.followUps.map((f) =>
                f.id === followUpId ? { ...f, status } : f
              ),
            }
          : client
      )
    );
  }, []);

  const updateFollowUp = useCallback((clientId: string, followUpId: string, updates: Partial<Omit<FollowUp, 'id' | 'clientId'>>) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? {
              ...client,
              followUps: client.followUps.map((f) =>
                f.id === followUpId ? { ...f, ...updates } : f
              ),
            }
          : client
      )
    );
  }, []);

  const deleteFollowUp = useCallback((clientId: string, followUpId: string) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? {
              ...client,
              followUps: client.followUps.filter((f) => f.id !== followUpId),
            }
          : client
      )
    );
  }, []);

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
