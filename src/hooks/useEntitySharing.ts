import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { EntityShare, ShareableEntityType, PermissionLevel } from '@/types/phase7';

export function useEntitySharing(entityType: ShareableEntityType | null, entityId: string | null) {
  const { user } = useAuth();
  const [shares, setShares] = useState<EntityShare[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchShares = useCallback(async () => {
    if (!entityType || !entityId || !user) { setShares([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entity_shares')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) { console.error('Error fetching entity shares:', error); setShares([]); return; }

      const userIds = data?.map(s => s.user_id) || [];
      if (userIds.length === 0) { setShares([]); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      setShares((data || []).map(s => {
        const profile = profiles?.find(p => p.id === s.user_id);
        return {
          id: s.id,
          entityType: s.entity_type as ShareableEntityType,
          entityId: s.entity_id,
          userId: s.user_id,
          userEmail: profile?.email || 'Unknown',
          userName: profile?.full_name || null,
          permission: s.permission as PermissionLevel,
          createdAt: s.created_at,
        };
      }));
    } finally { setLoading(false); }
  }, [entityType, entityId, user]);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  const shareEntity = async (userId: string, permission: PermissionLevel) => {
    if (!entityType || !entityId || !user) return { error: 'Not ready' };
    const { error } = await supabase.from('entity_shares').insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      permission,
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error: error.message };
    }
    toast({ title: 'Shared successfully' });
    await fetchShares();
    return { error: null };
  };

  const updatePermission = async (shareId: string, permission: PermissionLevel) => {
    const { error } = await supabase.from('entity_shares').update({ permission }).eq('id', shareId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else { await fetchShares(); }
  };

  const removeShare = async (shareId: string) => {
    const { error } = await supabase.from('entity_shares').delete().eq('id', shareId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Share removed' });
      await fetchShares();
    }
  };

  return { shares, loading, shareEntity, updatePermission, removeShare };
}
