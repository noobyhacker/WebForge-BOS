import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Client, FollowUp, FollowUpStatus } from '@/types/crm';
import { ClientCard } from './ClientCard';
import { ClientDetails } from './ClientDetails';
import { AddClientDialog } from './AddClientDialog';
import { ClientChatDialog } from './ClientChatDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Users } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';

export function ClientsView() {
  const { profile } = useAuth();
  const {
    clients, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    addClient, updateClient, deleteClient, claimClient, serveClient,
    updateFollowUpStatus, addFollowUp, updateFollowUp, deleteFollowUp,
  } = useClients(profile?.email || 'anonymous');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [chatClient, setChatClient] = useState<Client | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open chat from sidebar link
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && clients.length > 0) {
      const client = clients.find(c => c.id === chatId);
      if (client) {
        setChatClient(client);
        searchParams.delete('chat');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, clients]);

  const currentSelectedClient = selectedClient
    ? clients.find((c) => c.id === selectedClient.id) || null
    : null;

  return (
    <div className="flex h-full animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="space-y-4 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
              <p className="text-muted-foreground text-sm">Manage and track all your client relationships.</p>
            </div>
            <Button onClick={() => setShowAddClient(true)} className="gap-2 flex-shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Client</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {clients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto pb-4">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => setSelectedClient(client)}
                isSelected={currentSelectedClient?.id === client.id}
                onClaimClient={claimClient}
                onServeClient={serveClient}
                onOpenChat={(c) => setChatClient(c)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No clients found</p>
              <p className="text-sm text-muted-foreground/70">
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first client to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {currentSelectedClient && (
        <div className="w-96 border-l bg-card flex-shrink-0 ml-4">
          <ClientDetails
            client={currentSelectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdateFollowUp={(followUpId, status) => updateFollowUpStatus(currentSelectedClient.id, followUpId, status)}
            onAddFollowUp={(followUp) => addFollowUp(currentSelectedClient.id, followUp)}
            onEditFollowUp={(followUpId, updates) => updateFollowUp(currentSelectedClient.id, followUpId, updates)}
            onDeleteFollowUp={(followUpId) => deleteFollowUp(currentSelectedClient.id, followUpId)}
            onEditClient={(updates) => updateClient(currentSelectedClient.id, updates)}
            onDeleteClient={() => { deleteClient(currentSelectedClient.id); setSelectedClient(null); }}
          />
        </div>
      )}

      <AddClientDialog open={showAddClient} onOpenChange={setShowAddClient} onAdd={addClient} />

      {chatClient && (
        <ClientChatDialog
          open={!!chatClient}
          onOpenChange={(open) => !open && setChatClient(null)}
          clientId={chatClient.id}
          clientName={chatClient.name}
        />
      )}
    </div>
  );
}
