import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SlaBreach {
  id: string;
  slaConfigId: string;
  entityType: string;
  entityId: string;
  ownerId: string;
  breachedAt: string;
  resolvedAt?: string;
  thresholdMinutes: number;
  actualMinutes?: number;
}

export function useSlaBreaches() {
  const { user, isApproved } = useAuth();
  const [breaches, setBreaches] = useState<SlaBreach[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBreaches = useCallback(async () => {
    if (!user || !isApproved) { setBreaches([]); setLoading(false); return; }
    const { data } = await supabase
      .from('sla_breaches')
      .select('*')
      .order('created_at', { ascending: false });

    setBreaches((data || []).map((b: any) => ({
      id: b.id,
      slaConfigId: b.sla_config_id,
      entityType: b.entity_type,
      entityId: b.entity_id,
      ownerId: b.owner_id,
      breachedAt: b.breached_at,
      resolvedAt: b.resolved_at,
      thresholdMinutes: b.threshold_minutes,
      actualMinutes: b.actual_minutes ? Number(b.actual_minutes) : undefined,
    })));
    setLoading(false);
  }, [user, isApproved]);

  useEffect(() => { fetchBreaches(); }, [fetchBreaches]);

  const unresolvedCount = breaches.filter(b => !b.resolvedAt).length;

  return { breaches, loading, unresolvedCount, refetch: fetchBreaches };
}
