import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Client, FollowUp, FollowUpStatus } from '@/types/crm';
import { ClientDetails } from './ClientDetails';
import { AddClientDialog } from './AddClientDialog';
import { ClientChatDialog } from './ClientChatDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, MessageCircle, UserPlus, CheckCircle } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const statusBadgeVariant = (s: string) => {
  switch (s) {
    case 'active': return 'default';
    case 'lead': return 'secondary';
    case 'inactive': return 'outline';
    default: return 'outline';
  }
};

export function ClientsView() {
  const { profile, user } = useAuth();
  const {
    clients, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    addClient, updateClient, deleteClient, claimClient, serveClient,
    updateFollowUpStatus, addFollowUp, updateFollowUp, deleteFollowUp,
  } = useClients(profile?.email || 'anonymous');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [chatClient, setChatClient] = useState<Client | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const pendingCount = (client: Client) =>
    client.followUps.filter(f => f.status === 'pending' || f.status === 'overdue' || f.status === 'scheduled').length;

  return (
    <div className="flex h-full animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="space-y-4 mb-4">
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

          {/* Status tabs */}
          <div className="flex gap-1 border-b">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  statusFilter === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>

        {clients.length > 0 ? (
          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow-ups</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const isLead = client.status === 'lead';
                  const isOwner = client.userId === user?.id;
                  const pending = pendingCount(client);
                  return (
                    <TableRow
                      key={client.id}
                      className={cn(
                        'cursor-pointer',
                        currentSelectedClient?.id === client.id && 'bg-primary/5'
                      )}
                      onClick={() => setSelectedClient(client)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="truncate">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[150px]">{client.company}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[180px]">{client.email}</TableCell>
                      <TableCell className="text-muted-foreground">{client.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{client.language || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(client.status)} className="capitalize text-xs">
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pending > 0 ? (
                          <span className="text-xs font-medium text-warning">{pending} pending</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setChatClient(client)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                          {isLead && !isOwner && claimClient && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => claimClient(client.id)}>
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isLead && serveClient && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => serveClient(client.id)}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

      <div
        className={cn(
          'w-96 border-l bg-card flex-shrink-0 ml-4 transition-all duration-300 ease-out overflow-hidden',
          currentSelectedClient
            ? 'max-w-[24rem] opacity-100 translate-x-0'
            : 'max-w-0 opacity-0 translate-x-full border-l-0 ml-0'
        )}
      >
        {currentSelectedClient && (
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
        )}
      </div>

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
