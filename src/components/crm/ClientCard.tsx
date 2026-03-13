import { Client } from '@/types/crm';
import { StatusBadge } from './StatusBadge';
import { Building2, Mail, Phone, Calendar, UserPlus, CheckCircle, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
  isSelected?: boolean;
  onClaimClient?: (clientId: string) => void;
  onServeClient?: (clientId: string) => void;
  onOpenChat?: (client: Client) => void;
}

export function ClientCard({ client, onClick, isSelected, onClaimClient, onServeClient, onOpenChat }: ClientCardProps) {
  const { user } = useAuth();
  const pendingFollowUps = client.followUps.filter(
    (f) => f.status === 'pending' || f.status === 'overdue' || f.status === 'scheduled'
  ).length;

  const isLead = client.status === 'lead';
  const isOwner = client.userId === user?.id;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border-2 border-primary/40 bg-card p-4 transition-all hover-lift shadow-sm hover:border-primary hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">
              {client.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {client.name}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{client.company}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={client.status} className="flex-shrink-0" />
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{client.phone}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">Last contact: {new Date(client.lastContact).toLocaleDateString()}</span>
        </div>
      </div>

      {pendingFollowUps > 0 && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs font-medium text-warning">
            {pendingFollowUps} pending follow-up{pendingFollowUps > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Lead claim/serve actions */}
      {isLead && (
        <div className="mt-3 pt-3 border-t flex gap-2">
          {!isOwner && onClaimClient && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onClaimClient(client.id);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Claim
            </Button>
          )}
          {onServeClient && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onServeClient(client.id);
              }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Serve
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
