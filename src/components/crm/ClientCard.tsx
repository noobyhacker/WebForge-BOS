import { Client } from '@/types/crm';
import { StatusBadge } from './StatusBadge';
import { Building2, Mail, Phone, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
  isSelected?: boolean;
}

export function ClientCard({ client, onClick, isSelected }: ClientCardProps) {
  const pendingFollowUps = client.followUps.filter(
    (f) => f.status === 'pending' || f.status === 'overdue' || f.status === 'scheduled'
  ).length;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border-2 border-primary/40 bg-card p-4 transition-all hover-lift shadow-sm hover:border-primary hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {client.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {client.name}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {client.company}
            </div>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5" />
          <span>{client.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span>Last contact: {new Date(client.lastContact).toLocaleDateString()}</span>
        </div>
      </div>

      {pendingFollowUps > 0 && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs font-medium text-warning">
            {pendingFollowUps} pending follow-up{pendingFollowUps > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
