import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { AutomationRule, AutomationTrigger, AutomationAction, AutomationEntityType } from '@/types/phase4';

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching automation rules:', error);
      return;
    }

    setRules(
      (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        entityType: r.entity_type as AutomationEntityType,
        trigger: r.trigger_type as AutomationTrigger,
        triggerConfig: r.trigger_config || {},
        action: r.action_type as AutomationAction,
        actionConfig: r.action_config || {},
        isActive: r.is_active,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (rule: Omit<AutomationRule, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('automation_rules').insert({
      name: rule.name,
      description: rule.description,
      entity_type: rule.entityType,
      trigger_type: rule.trigger,
      trigger_config: rule.triggerConfig,
      action_type: rule.action,
      action_config: rule.actionConfig,
      is_active: rule.isActive,
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rule created' });
      fetchRules();
    }
  };

  const updateRule = async (id: string, updates: Partial<AutomationRule>) => {
    const mapped: any = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.entityType !== undefined) mapped.entity_type = updates.entityType;
    if (updates.trigger !== undefined) mapped.trigger_type = updates.trigger;
    if (updates.triggerConfig !== undefined) mapped.trigger_config = updates.triggerConfig;
    if (updates.action !== undefined) mapped.action_type = updates.action;
    if (updates.actionConfig !== undefined) mapped.action_config = updates.actionConfig;
    if (updates.isActive !== undefined) mapped.is_active = updates.isActive;

    const { error } = await supabase.from('automation_rules').update(mapped).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchRules();
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('automation_rules').update({ deleted_at: new Date().toISOString(), deleted_by: user!.id }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rule deleted' });
      fetchRules();
    }
  };

  return { rules, loading, addRule, updateRule, deleteRule };
}
