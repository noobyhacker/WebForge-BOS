import { Task } from '@/hooks/useTasks';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

interface TaskCardProps {
  task: Task;
  onComplete?: (id: string) => void;
  compact?: boolean;
}

export function TaskCard({ task, onComplete, compact }: TaskCardProps) {
  const profilesMap = useProfilesMap();
  const overdue = task.status !== 'done' && task.dueDate && isPast(new Date(task.dueDate));

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
      overdue ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card',
      task.status === 'done' && 'opacity-60'
    )}>
      {onComplete && task.status !== 'done' ? (
        <button onClick={() => onComplete(task.id)} className="flex-shrink-0 text-muted-foreground hover:text-success transition-colors">
          <CheckCircle2 className="h-4 w-4" />
        </button>
      ) : (
        <CheckCircle2 className={cn('h-4 w-4 flex-shrink-0', task.status === 'done' ? 'text-success' : 'text-muted-foreground/30')} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', task.status === 'done' && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {!compact && (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] h-4', priorityColors[task.priority])}>{task.priority}</Badge>
            {task.dueDate && (
              <span className={cn('text-[10px] flex items-center gap-0.5', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                {overdue && <AlertTriangle className="h-2.5 w-2.5" />}
                <Clock className="h-2.5 w-2.5" />
                {format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">→ {profilesMap[task.assignedTo] || 'Unknown'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
