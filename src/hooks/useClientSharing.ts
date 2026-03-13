import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClientShare, PermissionLevel } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useClientSharing(clientId: string | null) {
  const { user } = useAuth();
  const [shares, setShares] = useState<ClientShare[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShares = useCallback(async () => {
    if (!clientId || !user) {
      setShares([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch shares for this client
      const { data: sharesData, error: sharesError } = await supabase
        .from('client_shares')
        .select('*')
        .eq('client_id', clientId);

      if (sharesError) {
        console.error('Error fetching shares:', sharesError);
        setShares([]);
        return;
      }

      // Fetch profile info for shared users
      const userIds = sharesData?.map(s => s.user_id) || [];
      
      if (userIds.length === 0) {
        setShares([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      const sharesWithUsers: ClientShare[] = (sharesData || []).map(s => {
        const profile = profiles?.find(p => p.id === s.user_id);
        return {
          id: s.id,
          clientId: s.client_id,
          userId: s.user_id,
          userEmail: profile?.email || 'Unknown',
          userName: profile?.full_name || null,
          permission: s.permission as PermissionLevel,
          createdAt: s.created_at,
        };
      });

      setShares(sharesWithUsers);
    } catch (error) {
      console.error('Error in fetchShares:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, user]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const shareClient = useCallback(async (
    userIdToShare: string,
    permission: PermissionLevel
  ): Promise<{ error: string | null }> => {
    if (!clientId || !user) {
      return { error: 'Not authenticated or no client selected' };
    }

    try {
      const { error } = await supabase
        .from('client_shares')
        .insert({
          client_id: clientId,
          shared_with_user_id: userIdToShare,
          permission,
          created_by: user.id,
        });

      if (error) {
        console.error('Error sharing client:', error);
        return { error: error.message };
      }

      // Auto-share linked Account and Contact
      try {
        // Find the client to get company/name info
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, company')
          .eq('id', clientId)
          .single();

        if (clientData) {
          // Find linked account by company name and owner
          if (clientData.company) {
            const { data: accounts } = await supabase
              .from('accounts')
              .select('id')
              .eq('name', clientData.company)
              .limit(1);

            if (accounts && accounts.length > 0) {
              await supabase.from('entity_shares').insert({
                entity_type: 'account',
                entity_id: accounts[0].id,
                user_id: userIdToShare,
                permission,
                created_by: user.id,
              }).then(({ error: e }) => { if (e) console.warn('Auto-share account:', e.message); });
            }
          }

          // Find linked contact by client name
          if (clientData.name) {
            const nameParts = clientData.name.trim().split(/\s+/);
            const firstName = nameParts[0];
            let query = supabase.from('contacts').select('id').eq('first_name', firstName).limit(1);
            if (nameParts.length > 1) {
              query = query.eq('last_name', nameParts.slice(1).join(' '));
            }
            const { data: contacts } = await query;

            if (contacts && contacts.length > 0) {
              await supabase.from('entity_shares').insert({
                entity_type: 'contact',
                entity_id: contacts[0].id,
                user_id: userIdToShare,
                permission,
                created_by: user.id,
              }).then(({ error: e }) => { if (e) console.warn('Auto-share contact:', e.message); });
            }
          }
        }
      } catch (autoShareErr) {
        console.warn('Auto-share account/contact failed:', autoShareErr);
      }

      await fetchShares();
      return { error: null };
    } catch (error) {
      console.error('Error in shareClient:', error);
      return { error: 'Failed to share client' };
    }
  }, [clientId, user, fetchShares]);

  const updateSharePermission = useCallback(async (
    shareId: string,
    permission: PermissionLevel
  ): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('client_shares')
        .update({ permission })
        .eq('id', shareId);

      if (error) {
        console.error('Error updating share:', error);
        return { error: error.message };
      }

      await fetchShares();
      return { error: null };
    } catch (error) {
      console.error('Error in updateSharePermission:', error);
      return { error: 'Failed to update permission' };
    }
  }, [user, fetchShares]);

  const removeShare = useCallback(async (shareId: string): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('client_shares')
        .delete()
        .eq('id', shareId);

      if (error) {
        console.error('Error removing share:', error);
        return { error: error.message };
      }

      await fetchShares();
      return { error: null };
    } catch (error) {
      console.error('Error in removeShare:', error);
      return { error: 'Failed to remove share' };
    }
  }, [user, fetchShares]);

  return {
    shares,
    loading,
    shareClient,
    updateSharePermission,
    removeShare,
    refetch: fetchShares,
  };
}
