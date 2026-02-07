import { useState } from 'react';
import { Client, FollowUpStatus } from '@/types/crm';
import { ClientCard } from './ClientCard';
import { ClientDetails } from './ClientDetails';
import { AddClientDialog } from './AddClientDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Users } from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'followUps'>) => void;
  onUpdateFollowUp: (clientId: string, followUpId: string, status: FollowUpStatus) => void;
  onAddFollowUp: (clientId: string, followUp: { date: string; notes: string; type: 'call' | 'email' | 'meeting' | 'task'; status: FollowUpStatus }) => void;
}

export function ClientsView({
  clients,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddClient,
  onUpdateFollowUp,
  onAddFollowUp,
}: ClientsViewProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);

  // Update selected client when clients array changes
  const currentSelectedClient = selectedClient
    ? clients.find((c) => c.id === selectedClient.id) || null
    : null;

  return (
    <div className="flex h-full animate-fade-in">
      {/* Client List */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
              <p className="text-muted-foreground">
                Manage and track all your client relationships.
              </p>
            </div>
            <Button onClick={() => setShowAddClient(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Client Grid */}
        {clients.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto pb-4">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => setSelectedClient(client)}
                isSelected={currentSelectedClient?.id === client.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No clients found</p>
              <p className="text-sm text-muted-foreground/70">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first client to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Client Details Panel */}
      {currentSelectedClient && (
        <div className="w-96 border-l bg-card flex-shrink-0 ml-4">
          <ClientDetails
            client={currentSelectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdateFollowUp={(followUpId, status) =>
              onUpdateFollowUp(currentSelectedClient.id, followUpId, status)
            }
            onAddFollowUp={(followUp) => onAddFollowUp(currentSelectedClient.id, followUp)}
          />
        </div>
      )}

      <AddClientDialog
        open={showAddClient}
        onOpenChange={setShowAddClient}
        onAdd={onAddClient}
      />
    </div>
  );
}
