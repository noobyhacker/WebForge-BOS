import { FollowUp } from '@/types/crm';
import { StatusBadge } from './StatusBadge';
import { Phone, Mail, Calendar, CheckSquare, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowUpItemProps {
  followUp: FollowUp & { clientName?: string; clientCompany?: string };
  showClient?: boolean;
  onMarkComplete?: (id: string) => void;
}

const typeIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
};

const typeLabels = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
};

export function FollowUpItem({ followUp, showClient = false, onMarkComplete }: FollowUpItemProps) {
  const Icon = typeIcons[followUp.type];
  const isCompleted = followUp.status === 'completed';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-card p-3 transition-all',
        isCompleted && 'opacity-60'
      )}
    >
      <div
        className={cn(
          'rounded-lg p-2',
          followUp.status === 'overdue'
            ? 'bg-destructive/10 text-destructive'
            : followUp.status === 'completed'
            ? 'bg-success/10 text-success'
            : 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn('font-medium text-sm', isCompleted && 'line-through')}>
              {followUp.notes}
            </p>
            {showClient && followUp.clientName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {followUp.clientName} • {followUp.clientCompany}
              </p>
            )}
          </div>
          <StatusBadge status={followUp.status} />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded">
              {typeLabels[followUp.type]}
            </span>
            <span>{new Date(followUp.date).toLocaleDateString()}</span>
          </div>

          {!isCompleted && onMarkComplete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-success hover:text-success hover:bg-success/10"
              onClick={() => onMarkComplete(followUp.id)}
            >
              <Check className="h-3.5 w-3.5" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
