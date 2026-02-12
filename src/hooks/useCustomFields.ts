import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldType, CustomFieldEntityType } from '@/types/phase6';

export function useCustomFields() {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFields = useCallback(async () => {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching custom fields:', error);
      setLoading(false);
      return;
    }

    setFields(
      (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        fieldType: f.field_type as CustomFieldType,
        entityType: f.entity_type as CustomFieldEntityType,
        options: f.options || [],
        isRequired: f.is_required || false,
        sortOrder: f.sort_order || 0,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  const fetchValues = useCallback(async (entityId: string) => {
    const { data, error } = await supabase
      .from('custom_field_values')
      .select('*')
      .eq('entity_id', entityId);

    if (error) {
      console.error('Error fetching custom field values:', error);
      return;
    }

    setValues(
      (data || []).map((v: any) => ({
        id: v.id,
        fieldId: v.field_id,
        entityId: v.entity_id,
        value: v.value || '',
      }))
    );
  }, []);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const addField = async (field: Omit<CustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await supabase.from('custom_fields').insert({
      name: field.name,
      label: field.label,
      field_type: field.fieldType,
      entity_type: field.entityType,
      options: field.options,
      is_required: field.isRequired,
      sort_order: field.sortOrder,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Custom field created' });
      fetchFields();
    }
  };

  const updateField = async (id: string, updates: Partial<CustomFieldDefinition>) => {
    const mapped: any = {};
    if (updates.label !== undefined) mapped.label = updates.label;
    if (updates.options !== undefined) mapped.options = updates.options;
    if (updates.isRequired !== undefined) mapped.is_required = updates.isRequired;
    if (updates.sortOrder !== undefined) mapped.sort_order = updates.sortOrder;

    const { error } = await supabase.from('custom_fields').update(mapped).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchFields();
    }
  };

  const deleteField = async (id: string) => {
    const { error } = await supabase.from('custom_fields').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Custom field deleted' });
      fetchFields();
    }
  };

  const setFieldValue = async (fieldId: string, entityId: string, value: string) => {
    const { error } = await supabase.from('custom_field_values').upsert(
      { field_id: fieldId, entity_id: entityId, value },
      { onConflict: 'field_id,entity_id' }
    );
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchValues(entityId);
    }
  };

  const getFieldsForEntity = (entityType: CustomFieldEntityType) =>
    fields.filter(f => f.entityType === entityType);

  return {
    fields, values, loading,
    addField, updateField, deleteField,
    fetchValues, setFieldValue, getFieldsForEntity,
  };
}
