import { useClientAssignments } from '@/hooks/useClientAssignments';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserPlus, Pin, FileIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ClientAssignmentSectionProps {
  clientId: string;
  onAssign: () => void;
}

export function ClientAssignmentSection({ clientId, onAssign }: ClientAssignmentSectionProps) {
  const { isAdmin, isSalesManager, hasPermission } = useAuth();
  const { assignments, files, loading, removeAssignment, deleteFile } = useClientAssignments(clientId);
  const { profiles } = useProfilesMap();

  const canAssign = isAdmin || isSalesManager || hasPermission('assign_clients');

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Assignments
        </h4>
        {canAssign && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onAssign}>
            <UserPlus className="h-3.5 w-3.5" />
            Assign
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No assignments yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => {
            const assignee = profiles.get(a.assigned_to);
            const assigner = profiles.get(a.assigned_by);
            const assignmentFiles = files.filter(f => f.assignment_id === a.id);
            return (
              <div key={a.id} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      → {assignee?.fullName || assignee?.email || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      by {assigner?.fullName || assigner?.email || 'Unknown'} · {format(new Date(a.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {canAssign && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeAssignment(a.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>

                {a.pinned_notes && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Pin className="h-3 w-3 flex-shrink-0 mt-0.5 text-primary" />
                    <span>{a.pinned_notes}</span>
                  </div>
                )}

                {assignmentFiles.length > 0 && (
                  <div className="space-y-1">
                    {assignmentFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-2 text-xs">
                        <FileIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        <a href={f.file_url} target="_blank" rel="noopener" className="truncate flex-1 text-primary hover:underline">
                          {f.file_name}
                        </a>
                        {canAssign && (
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteFile(f.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
