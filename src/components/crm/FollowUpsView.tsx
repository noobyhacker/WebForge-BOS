import { Client, FollowUp } from '@/types/crm';
import { FollowUpItem } from './FollowUpItem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface FollowUpsViewProps {
  clients: Client[];
  onMarkComplete: (clientId: string, followUpId: string) => void;
}

export function FollowUpsView({ clients, onMarkComplete }: FollowUpsViewProps) {
  const allFollowUps = clients.flatMap((c) =>
    c.followUps.map((f) => ({
      ...f,
      clientName: c.name,
      clientCompany: c.company,
    }))
  );

  const overdueFollowUps = allFollowUps.filter((f) => f.status === 'overdue');
  const pendingFollowUps = allFollowUps.filter((f) => f.status === 'pending' || f.status === 'scheduled');
  const completedFollowUps = allFollowUps.filter((f) => f.status === 'completed');

  const sortedPending = [...pendingFollowUps].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const sortedCompleted = [...completedFollowUps].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
        <p className="text-muted-foreground">Track and manage all your client follow-ups.</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingFollowUps.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Overdue ({overdueFollowUps.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedFollowUps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2">
          {sortedPending.length > 0 ? (
            sortedPending.map((followUp) => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                showClient
                onMarkComplete={(id) => onMarkComplete(followUp.clientId, id)}
              />
            ))
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending follow-ups"
              description="You're all caught up!"
            />
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-2">
          {overdueFollowUps.length > 0 ? (
            overdueFollowUps.map((followUp) => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                showClient
                onMarkComplete={(id) => onMarkComplete(followUp.clientId, id)}
              />
            ))
          ) : (
            <EmptyState
              icon={AlertCircle}
              title="No overdue follow-ups"
              description="Great job staying on top of things!"
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2">
          {sortedCompleted.length > 0 ? (
            sortedCompleted.map((followUp) => (
              <FollowUpItem key={followUp.id} followUp={followUp} showClient />
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No completed follow-ups"
              description="Complete your first follow-up to see it here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12 bg-card rounded-lg border">
      <Icon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-muted-foreground font-medium">{title}</p>
      <p className="text-sm text-muted-foreground/70">{description}</p>
    </div>
  );
}
