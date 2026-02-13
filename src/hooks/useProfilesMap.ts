import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileInfo {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

export function useProfilesMap() {
  const { user, isApproved } = useAuth();
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    if (!user || !isApproved) { setLoading(false); return; }
    try {
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const roleMap = new Map<string, string[]>();
      (roleData || []).forEach((r: any) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const map = new Map<string, ProfileInfo>();
      (profileData || []).forEach((p: any) => {
        map.set(p.id, {
          id: p.id,
          fullName: p.full_name || p.email || 'Unknown',
          email: p.email || '',
          roles: roleMap.get(p.id) || [],
        });
      });
      setProfiles(map);
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const getOwnerName = useCallback((ownerId: string) => {
    return profiles.get(ownerId)?.fullName || 'Unknown';
  }, [profiles]);

  const getOwnerRole = useCallback((ownerId: string) => {
    const roles = profiles.get(ownerId)?.roles || [];
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('sales_manager')) return 'Sales Manager';
    if (roles.includes('sales')) return 'Sales';
    return 'User';
  }, [profiles]);

  return { profiles, loading, getOwnerName, getOwnerRole, refetch: fetchProfiles };
}
