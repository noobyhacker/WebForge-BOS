import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Kpi {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  frequency: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KpiCategory = 'revenue' | 'sales' | 'customer' | 'operations' | 'general';
export type KpiUnit = 'number' | 'currency' | 'percentage' | 'hours' | 'days';
export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const KPI_CATEGORIES: { value: KpiCategory; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer', label: 'Customer' },
  { value: 'operations', label: 'Operations' },
  { value: 'general', label: 'General' },
];

export const KPI_UNITS: { value: KpiUnit; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

export const KPI_FREQUENCIES: { value: KpiFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function useKpis() {
  const { user, isApproved } = useAuth();
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKpis = useCallback(async () => {
    if (!user || !isApproved) { setKpis([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('kpis' as any)
        .select('*')
        .order('category')
        .order('name');
      if (error) { console.error('Error fetching KPIs:', error); return; }
      setKpis((data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        category: d.category,
        unit: d.unit,
        targetValue: Number(d.target_value) || 0,
        currentValue: Number(d.current_value) || 0,
        frequency: d.frequency,
        ownerId: d.owner_id,
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const addKpi = useCallback(async (kpi: Omit<Kpi, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    if (!user) return;
    const { error } = await supabase.from('kpis' as any).insert({
      name: kpi.name,
      description: kpi.description,
      category: kpi.category,
      unit: kpi.unit,
      target_value: kpi.targetValue,
      current_value: kpi.currentValue,
      frequency: kpi.frequency,
      is_active: kpi.isActive,
      owner_id: user.id,
    } as any);
    if (error) { console.error('Error adding KPI:', error); throw error; }
    await fetchKpis();
  }, [user, fetchKpis]);

  const updateKpi = useCallback(async (id: string, updates: Partial<Kpi>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
    if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    const { error } = await supabase.from('kpis' as any).update(dbUpdates as any).eq('id', id);
    if (error) { console.error('Error updating KPI:', error); throw error; }
    await fetchKpis();
  }, [user, fetchKpis]);

  const deleteKpi = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('kpis' as any).delete().eq('id', id);
    if (error) { console.error('Error deleting KPI:', error); throw error; }
    await fetchKpis();
  }, [user, fetchKpis]);

  return { kpis, loading, addKpi, updateKpi, deleteKpi, refetch: fetchKpis };
}
