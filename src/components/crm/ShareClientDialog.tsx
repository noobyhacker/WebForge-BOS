import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useClientSharing } from '@/hooks/useClientSharing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionLevel } from '@/types/crm';
import { Loader2, UserPlus, Trash2, Eye, Pencil } from 'lucide-react';

interface ShareClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

interface ApprovedUser {
  id: string;
  email: string;
  full_name: string | null;
}

export function ShareClientDialog({ open, onOpenChange, clientId, clientName }: ShareClientDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { shares, loading: sharesLoading, shareClient, updateSharePermission, removeShare } = useClientSharing(clientId);
  
  const [availableUsers, setAvailableUsers] = useState<ApprovedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>('view');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch approved users who can be shared with
  useEffect(() => {
    if (!open || !user) return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('is_approved', true)
          .neq('id', user.id); // Exclude current user

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }

        setAvailableUsers(data || []);
      } catch (error) {
        console.error('Error in fetchUsers:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [open, user]);

  // Filter out users who already have access
  const usersNotShared = availableUsers.filter(
    u => !shares.some(s => s.userId === u.id)
  );

  const handleShare = async () => {
    if (!selectedUserId) {
      toast({ title: 'Please select a user', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await shareClient(selectedUserId, selectedPermission);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Failed to share', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Client shared successfully' });
      setSelectedUserId('');
      setSelectedPermission('view');
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: PermissionLevel) => {
    const { error } = await updateSharePermission(shareId, newPermission);
    if (error) {
      toast({ title: 'Failed to update permission', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Permission updated' });
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    const { error } = await removeShare(shareId);
    if (error) {
      toast({ title: 'Failed to remove access', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Access removed' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Client</DialogTitle>
          <DialogDescription>
            Share "{clientName}" with other team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new share */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Add user</label>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingUsers ? 'Loading...' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  {usersNotShared.length === 0 ? (
                    <SelectItem value="none" disabled>No users available</SelectItem>
                  ) : (
                    usersNotShared.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as PermissionLevel)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> View
                    </span>
                  </SelectItem>
                  <SelectItem value="edit">
                    <span className="flex items-center gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleShare} disabled={!selectedUserId || submitting} size="icon">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Current shares */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Shared with</label>
            
            {sharesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not shared with anyone yet
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {share.userName || share.userEmail}
                      </p>
                      {share.userName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {share.userEmail}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <Select
                        value={share.permission}
                        onValueChange={(v) => handleUpdatePermission(share.id, v as PermissionLevel)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveShare(share.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
