import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Permission {
  id: string;
  key: string;
  description: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permissionId: string;
}

export function usePermissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userPermissionKeys, setUserPermissionKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: perms }, { data: rp }, { data: userRoles }] = await Promise.all([
      supabase.from('permissions').select('*').order('key'),
      supabase.from('role_permissions').select('*'),
      user ? supabase.from('user_roles').select('role').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);

    setPermissions((perms || []).map(p => ({ id: p.id, key: p.key, description: p.description || '' })));
    setRolePermissions((rp || []).map(r => ({ id: r.id, role: r.role, permissionId: r.permission_id })));

    // Compute user's effective permissions
    const roles = (userRoles || []).map((r: any) => r.role);
    const userPermIds = new Set((rp || []).filter(r => roles.includes(r.role)).map(r => r.permission_id));
    setUserPermissionKeys((perms || []).filter(p => userPermIds.has(p.id)).map(p => p.key));

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const hasPermission = useCallback((key: string) => userPermissionKeys.includes(key), [userPermissionKeys]);

  const grantPermission = async (role: string, permissionId: string) => {
    const { error } = await supabase.from('role_permissions').insert({ role: role as any, permission_id: permissionId });
    if (error) {
      if (error.code === '23505') return; // Duplicate
      toast({ title: 'Error', description: 'Failed to grant permission.', variant: 'destructive' });
      return;
    }
    await fetchAll();
  };

  const revokePermission = async (role: string, permissionId: string) => {
    const { error } = await supabase.from('role_permissions').delete()
      .eq('role', role as any).eq('permission_id', permissionId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to revoke permission.', variant: 'destructive' });
      return;
    }
    await fetchAll();
  };

  return { permissions, rolePermissions, userPermissionKeys, hasPermission, loading, grantPermission, revokePermission, refetch: fetchAll };
}
