import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'lead' | 'pending' | 'completed' | 'overdue' | 'scheduled';
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-success/10 text-success',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground',
  },
  lead: {
    label: 'Lead',
    className: 'bg-primary/10 text-primary',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/10 text-success',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-destructive/10 text-destructive',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-primary/10 text-primary',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'status-badge',
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
