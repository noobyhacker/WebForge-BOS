import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FieldPermission } from '@/types/phase7';

export function useFieldPermissions() {
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPermissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('field_permissions')
      .select('*')
      .order('entity_type', { ascending: true });

    if (error) {
      console.error('Error fetching field permissions:', error);
      setLoading(false);
      return;
    }

    setPermissions(
      (data || []).map((p: any) => ({
        id: p.id,
        entityType: p.entity_type,
        fieldName: p.field_name,
        role: p.role,
        canView: p.can_view,
        canEdit: p.can_edit,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const addPermission = async (perm: Omit<FieldPermission, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await supabase.from('field_permissions').insert({
      entity_type: perm.entityType,
      field_name: perm.fieldName,
      role: perm.role,
      can_view: perm.canView,
      can_edit: perm.canEdit,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Permission created' });
      fetchPermissions();
    }
  };

  const updatePermission = async (id: string, updates: Partial<FieldPermission>) => {
    const mapped: any = {};
    if (updates.canView !== undefined) mapped.can_view = updates.canView;
    if (updates.canEdit !== undefined) mapped.can_edit = updates.canEdit;

    const { error } = await supabase.from('field_permissions').update(mapped).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else { fetchPermissions(); }
  };

  const deletePermission = async (id: string) => {
    const { error } = await supabase.from('field_permissions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Permission deleted' });
      fetchPermissions();
    }
  };

  const canViewField = (entityType: string, fieldName: string, isAdmin: boolean) => {
    const role = isAdmin ? 'admin' : 'user';
    const perm = permissions.find(p => p.entityType === entityType && p.fieldName === fieldName && p.role === role);
    return perm ? perm.canView : true; // default allow
  };

  const canEditField = (entityType: string, fieldName: string, isAdmin: boolean) => {
    const role = isAdmin ? 'admin' : 'user';
    const perm = permissions.find(p => p.entityType === entityType && p.fieldName === fieldName && p.role === role);
    return perm ? perm.canEdit : true; // default allow
  };

  return { permissions, loading, addPermission, updatePermission, deletePermission, canViewField, canEditField };
}
