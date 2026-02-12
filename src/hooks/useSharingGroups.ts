import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SharingGroup } from '@/types/phase7';

export function useSharingGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SharingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from('sharing_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sharing groups:', error);
      setLoading(false);
      return;
    }

    setGroups(
      (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        memberIds: g.member_ids || [],
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const addGroup = async (group: { name: string; description: string; memberIds: string[] }) => {
    const { error } = await supabase.from('sharing_groups').insert({
      name: group.name,
      description: group.description,
      member_ids: group.memberIds,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Group created' });
      fetchGroups();
    }
  };

  const updateGroup = async (id: string, updates: Partial<SharingGroup>) => {
    const mapped: any = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.memberIds !== undefined) mapped.member_ids = updates.memberIds;

    const { error } = await supabase.from('sharing_groups').update(mapped).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else { fetchGroups(); }
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('sharing_groups').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Group deleted' });
      fetchGroups();
    }
  };

  return { groups, loading, addGroup, updateGroup, deleteGroup };
}
