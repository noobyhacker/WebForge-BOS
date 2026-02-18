import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FormField {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface Form {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  form_fields?: FormField[];
}

export interface FormSubmission {
  id: string;
  form_id: string;
  lead_id: string | null;
  source: string;
  page_url: string;
  submitted_at: string;
}

export function useForms() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*, form_fields(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Form[];
    },
    enabled: !!user,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['form_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as FormSubmission[];
    },
    enabled: !!user,
  });

  const createForm = useMutation({
    mutationFn: async (form: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from('forms')
        .insert({ ...form, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); toast.success('Form created'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase.from('forms').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); toast.success('Form deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveFields = useMutation({
    mutationFn: async ({ formId, fields }: { formId: string; fields: Omit<FormField, 'id' | 'created_at'>[] }) => {
      // Delete existing fields and re-insert
      await supabase.from('form_fields').delete().eq('form_id', formId);
      if (fields.length > 0) {
        const { error } = await supabase.from('form_fields').insert(fields);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); toast.success('Fields saved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { forms, isLoading, submissions, createForm, updateForm, deleteForm, saveFields };
}
