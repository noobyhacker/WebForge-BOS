import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EmailTemplate } from '@/types/phase3';

export function useEmailTemplates() {
  const { user, isApproved } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user || !isApproved) { setTemplates([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name', { ascending: true });
      if (error) { console.error('Error fetching email templates:', error); return; }
      setTemplates((data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addTemplate = useCallback(async (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('email_templates').insert({
      name: template.name,
      subject: template.subject,
      body: template.body,
      created_by: user.id,
    });
    if (error) { console.error('Error adding template:', error); throw error; }
    await fetchTemplates();
  }, [user, fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<EmailTemplate>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.body !== undefined) dbUpdates.body = updates.body;
    const { error } = await supabase.from('email_templates').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating template:', error); return; }
    await fetchTemplates();
  }, [user, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) { console.error('Error deleting template:', error); return; }
    await fetchTemplates();
  }, [user, fetchTemplates]);

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
