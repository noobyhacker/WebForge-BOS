import { Activity, ActivityType } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Users, ListTodo, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

const typeIcons: Record<ActivityType, typeof Phone> = { call: Phone, email: Mail, meeting: Users, task: ListTodo };

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activities yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {activities.map(a => {
          const Icon = typeIcons[a.type];
          const isCompleted = a.status === 'completed';
          return (
            <div key={a.id} className="relative pl-10">
              <div className={`absolute left-2 top-1 h-5 w-5 rounded-full flex items-center justify-center ${isCompleted ? 'bg-success/20' : 'bg-primary/20'}`}>
                {isCompleted ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Icon className="h-3 w-3 text-primary" />}
              </div>
              <Card className="border-0 shadow-none bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{a.subject}</p>
                      {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">{a.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(a.createdAt), 'MMM d, yyyy h:mm a')}
                    {a.dueDate && ` · Due: ${format(new Date(a.dueDate), 'MMM d')}`}
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
