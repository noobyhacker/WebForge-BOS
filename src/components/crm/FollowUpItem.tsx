import { useState } from 'react';
import { FollowUp } from '@/types/crm';
import { StatusBadge } from './StatusBadge';
import { Phone, Mail, Calendar, CheckSquare, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

interface FollowUpItemProps {
  followUp: FollowUp & { clientName?: string; clientCompany?: string };
  showClient?: boolean;
  onMarkComplete?: (id: string) => void;
  onEdit?: (followUp: FollowUp) => void;
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

export function FollowUpItem({ followUp, showClient = false, onMarkComplete, onEdit }: FollowUpItemProps) {
  const Icon = typeIcons[followUp.type];
  const isCompleted = followUp.status === 'completed';
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const handleMarkComplete = () => {
    onMarkComplete?.(followUp.id);
    setShowCompleteConfirm(false);
  };

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border-2 border-primary/40 bg-card p-4 transition-all shadow-sm hover:border-primary hover:shadow-md',
          isCompleted && 'opacity-60 border-muted'
        )}
      >
        <div
          className={cn(
            'rounded-lg p-2 shrink-0',
            followUp.status === 'overdue'
              ? 'bg-destructive/10 text-destructive'
              : followUp.status === 'completed'
              ? 'bg-success/10 text-success'
              : 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium text-sm break-words', isCompleted && 'line-through')}>
                {followUp.notes}
              </p>
              {showClient && followUp.clientName && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {followUp.clientName} • {followUp.clientCompany}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <StatusBadge status={followUp.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded whitespace-nowrap">
                {typeLabels[followUp.type]}
              </span>
              <span className="whitespace-nowrap">{new Date(followUp.date).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(followUp)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {!isCompleted && onMarkComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-success hover:text-success hover:bg-success/10"
                  onClick={() => setShowCompleteConfirm(true)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title="Mark as Complete"
        description={`Are you sure you want to mark this ${typeLabels[followUp.type].toLowerCase()} as completed?`}
        confirmText="Complete"
        onConfirm={handleMarkComplete}
      />
    </>
  );
}
