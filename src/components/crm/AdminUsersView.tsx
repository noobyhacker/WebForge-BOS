import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Shield, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from './ConfirmDialog';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  roles: string[];
}

export const AdminUsersView = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Confirmation dialog states
  const [confirmAction, setConfirmAction] = useState<{
    type: 'revoke' | 'toggleAdmin';
    userId: string;
    userName: string;
    isAdmin?: boolean;
  } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({
        title: 'Error fetching users',
        description: profilesError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast({
        title: 'Error fetching roles',
        description: rolesError.message,
        variant: 'destructive',
      });
    }

    // Combine profiles with roles, mapping DB fields to interface
    const usersWithRoles = profiles.map(profile => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      is_approved: profile.is_approved,
      created_at: profile.created_at,
      roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_approved: true,
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Error approving user',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'User approved successfully' });
      fetchUsers();
    }
  };

  const revokeApproval = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_approved: false,
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Error revoking approval',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'User approval revoked' });
      fetchUsers();
    }
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast({
          title: 'Error removing admin role',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Admin role removed' });
        fetchUsers();
      }
    } else {
      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        toast({
          title: 'Error adding admin role',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Admin role granted' });
        fetchUsers();
      }
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === 'revoke') {
      revokeApproval(confirmAction.userId);
    } else if (confirmAction.type === 'toggleAdmin') {
      toggleAdminRole(confirmAction.userId, confirmAction.isAdmin ?? false);
    }
    setConfirmAction(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Approve users and manage roles</p>
      </div>

      {/* Pending Approval Section */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="secondary">{pendingUsers.length}</Badge>
              Pending Approval
            </CardTitle>
            <CardDescription>These users are waiting for your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || 'No name'}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => approveUser(u.id)}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approved Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approved Users</CardTitle>
          <CardDescription>Users with access to the CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedUsers.map(u => {
                const isAdmin = u.roles.includes('admin');
                const isCurrentUser = u.id === user?.id;

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || 'No name'}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2">You</Badge>
                      )}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Badge className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {!isCurrentUser && (
                        <>
                          <Button
                            size="sm"
                            variant={isAdmin ? 'outline' : 'secondary'}
                            onClick={() => setConfirmAction({
                              type: 'toggleAdmin',
                              userId: u.id,
                              userName: u.full_name || u.email || 'User',
                              isAdmin,
                            })}
                          >
                            {isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setConfirmAction({
                              type: 'revoke',
                              userId: u.id,
                              userName: u.full_name || u.email || 'User',
                            })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmAction?.type === 'revoke'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Revoke Access"
        description={`This will remove ${confirmAction?.userName}'s access to the CRM. They'll need to be approved again to regain access.`}
        confirmText="Revoke Access"
        variant="destructive"
        onConfirm={handleConfirmAction}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'toggleAdmin'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.isAdmin ? 'Remove Admin Role' : 'Grant Admin Role'}
        description={
          confirmAction?.isAdmin
            ? `Are you sure you want to remove admin privileges from ${confirmAction?.userName}? They will no longer be able to manage users or see all data.`
            : `Are you sure you want to grant admin privileges to ${confirmAction?.userName}? They will be able to manage users and see all data.`
        }
        confirmText={confirmAction?.isAdmin ? 'Remove Admin' : 'Make Admin'}
        variant={confirmAction?.isAdmin ? 'destructive' : 'default'}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};
