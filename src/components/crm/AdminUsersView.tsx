import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Shield, Loader2, UserCheck, Users } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  roles: string[];
}

const ALL_ROLES = [
  { key: 'admin', label: 'Admin', icon: Shield, color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { key: 'sales_manager', label: 'Manager', icon: Users, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { key: 'sales', label: 'Sales', icon: null, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { key: 'finance', label: 'Finance', icon: null, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { key: 'user', label: 'User', icon: null, color: 'bg-muted text-muted-foreground border-border' },
  { key: 'viewer', label: 'Viewer', icon: null, color: 'bg-muted text-muted-foreground border-border' },
] as const;

export const AdminUsersView = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmRevoke, setConfirmRevoke] = useState<{ userId: string; name: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    if (pErr) {
      toast({ title: 'Error fetching users', description: pErr.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (rErr) toast({ title: 'Error fetching roles', description: rErr.message, variant: 'destructive' });

    setUsers(
      (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        is_approved: p.is_approved ?? false,
        created_at: p.created_at ?? '',
        roles: roles?.filter(r => r.user_id === p.id).map(r => r.role) || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const approveUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'User approved' }); fetchUsers(); }
  };

  const revokeApproval = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: false }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Access revoked' }); fetchUsers(); }
  };

  const toggleRole = async (userId: string, role: string, hasRole: boolean) => {
    setToggling(`${userId}-${role}`);
    if (hasRole) {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else fetchUsers();
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else fetchUsers();
    }
    setToggling(null);
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Approve users and assign roles</p>
      </div>

      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">{pendingUsers.length}</Badge>
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Button size="sm" onClick={() => approveUser(u.id)} className="gap-1 h-7 text-xs shrink-0">
                    <UserCheck className="h-3.5 w-3.5" /> Approve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Active Users ({approvedUsers.length})</CardTitle>
          <CardDescription className="text-xs">Click role badges to toggle</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="py-2">User</TableHead>
                <TableHead className="py-2">Roles</TableHead>
                <TableHead className="py-2 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedUsers.map(u => {
                const isCurrentUser = u.id === user?.id;
                return (
                  <TableRow key={u.id} className="group">
                    <TableCell className="py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{u.full_name || 'No name'}</span>
                          {isCurrentUser && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">You</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {ALL_ROLES.map(r => {
                          const hasRole = u.roles.includes(r.key);
                          const isDisabled = isCurrentUser || toggling === `${u.id}-${r.key}`;
                          return (
                            <button
                              key={r.key}
                              disabled={isDisabled}
                              onClick={() => toggleRole(u.id, r.key, hasRole)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all',
                                'hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
                                hasRole ? r.color : 'bg-transparent text-muted-foreground/40 border-dashed border-border'
                              )}
                            >
                              {hasRole && <Check className="h-2.5 w-2.5" />}
                              {r.icon && <r.icon className="h-2.5 w-2.5" />}
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {!isCurrentUser && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => setConfirmRevoke({ userId: u.id, name: u.full_name || u.email || 'User' })}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmRevoke}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title="Revoke Access"
        description={`Remove ${confirmRevoke?.name}'s access? They'll need re-approval.`}
        confirmText="Revoke"
        variant="destructive"
        onConfirm={() => { if (confirmRevoke) { revokeApproval(confirmRevoke.userId); setConfirmRevoke(null); } }}
      />
    </div>
  );
};
