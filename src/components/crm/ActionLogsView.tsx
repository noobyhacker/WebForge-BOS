import { useState } from 'react';
import { ActionLog } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCircle, Clock, Plus, Pencil, Trash2, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';

const actionTypeConfig = {
  create: { label: 'Created', icon: Plus, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  update: { label: 'Updated', icon: Pencil, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  delete: { label: 'Deleted', icon: Trash2, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const entityTypeLabels = { client: 'Client', follow_up: 'Follow-up' };

export function ActionLogsView() {
  const { profile } = useAuth();
  const { actionLogs, restoreFromLog } = useClients(profile?.email || 'anonymous');

  const [restoreLog, setRestoreLog] = useState<ActionLog | null>(null);
  const [restoring, setRestoring] = useState(false);
  const { toast } = useToast();

  const handleRestore = async () => {
    if (!restoreLog || !restoreFromLog) return;
    setRestoring(true);
    try {
      const success = await restoreFromLog(restoreLog);
      if (success) {
        toast({ title: 'Restored successfully', description: `${entityTypeLabels[restoreLog.entityType]} "${restoreLog.entityName}" has been restored.` });
      } else {
        toast({ title: 'Restore failed', description: 'Could not restore the item.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Restore failed', description: 'An error occurred while restoring.', variant: 'destructive' });
    } finally { setRestoring(false); setRestoreLog(null); }
  };

  if (actionLogs.length === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-foreground">Action Logs</h1><p className="text-muted-foreground mt-1">Track all activities in the system</p></div>
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><Clock className="h-12 w-12 text-muted-foreground/50 mb-4" /><h3 className="text-lg font-medium text-foreground mb-1">No actions yet</h3><p className="text-sm text-muted-foreground">Activities will appear here when you create, update, or delete clients and follow-ups.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-foreground">Action Logs</h1><p className="text-muted-foreground mt-1">Track all activities in the system</p></div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4">
              {actionLogs.map((log) => {
                const config = actionTypeConfig[log.actionType];
                const Icon = config.icon;
                const canRestore = log.actionType === 'delete' && log.entityData && restoreFromLog;
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className={`p-2 rounded-full ${config.className}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config.className}>{config.label}</Badge>
                        <Badge variant="secondary">{entityTypeLabels[log.entityType]}</Badge>
                        <span className="font-medium text-foreground">{log.entityName}</span>
                      </div>
                      {log.details && <p className="text-sm text-muted-foreground mt-1 truncate">{log.details}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><UserCircle className="h-3 w-3" />{log.userEmail}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    {canRestore && (
                      <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setRestoreLog(log)}><Undo2 className="h-3.5 w-3.5" />Undo</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <ConfirmDialog open={!!restoreLog} onOpenChange={(open) => !open && setRestoreLog(null)} title="Restore Deleted Item" description={`Are you sure you want to restore "${restoreLog?.entityName}"? This will recreate the ${restoreLog?.entityType === 'client' ? 'client' : 'follow-up'}.`} confirmText={restoring ? 'Restoring...' : 'Restore'} onConfirm={handleRestore} />
    </div>
  );
}
