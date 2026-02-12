import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LeadScoringRule, LeadScore } from '@/types/phase4';
import type { Client } from '@/types/crm';
import type { Contact } from '@/types/crm';

export function useLeadScoringRules() {
  const [rules, setRules] = useState<LeadScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_scoring_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead scoring rules:', error);
      setLoading(false);
      return;
    }

    setRules(
      (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        field: r.field,
        operator: r.operator,
        value: r.value,
        points: r.points,
        entityType: r.entity_type,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (rule: Omit<LeadScoringRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await supabase.from('lead_scoring_rules').insert({
      name: rule.name,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      points: rule.points,
      entity_type: rule.entityType,
      is_active: rule.isActive,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Scoring rule created' });
      fetchRules();
    }
  };

  const updateRule = async (id: string, updates: Partial<LeadScoringRule>) => {
    const mapped: any = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.field !== undefined) mapped.field = updates.field;
    if (updates.operator !== undefined) mapped.operator = updates.operator;
    if (updates.value !== undefined) mapped.value = updates.value;
    if (updates.points !== undefined) mapped.points = updates.points;
    if (updates.isActive !== undefined) mapped.is_active = updates.isActive;

    const { error } = await supabase.from('lead_scoring_rules').update(mapped).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchRules();
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('lead_scoring_rules').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rule deleted' });
      fetchRules();
    }
  };

  return { rules, loading, addRule, updateRule, deleteRule };
}

// Client-side lead scoring calculator
export function calculateLeadScore(
  entity: Client | Contact,
  entityType: 'client' | 'contact',
  rules: LeadScoringRule[]
): LeadScore {
  const activeRules = rules.filter(r => r.isActive && r.entityType === entityType);
  const breakdown: { ruleName: string; points: number }[] = [];

  for (const rule of activeRules) {
    const fieldValue = String((entity as any)[rule.field] || '');
    let match = false;

    switch (rule.operator) {
      case 'equals':
        match = fieldValue.toLowerCase() === rule.value.toLowerCase();
        break;
      case 'contains':
        match = fieldValue.toLowerCase().includes(rule.value.toLowerCase());
        break;
      case 'greater_than':
        match = Number(fieldValue) > Number(rule.value);
        break;
      case 'less_than':
        match = Number(fieldValue) < Number(rule.value);
        break;
      case 'exists':
        match = fieldValue.trim().length > 0;
        break;
    }

    if (match) {
      breakdown.push({ ruleName: rule.name, points: rule.points });
    }
  }

  return {
    entityId: entity.id,
    entityType,
    score: breakdown.reduce((sum, b) => sum + b.points, 0),
    breakdown,
  };
}
