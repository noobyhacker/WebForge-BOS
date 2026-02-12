import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '@/types/phase5';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
      return;
    }

    setDocuments(
      (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        fileUrl: d.file_url,
        fileSize: d.file_size || 0,
        mimeType: d.mime_type || '',
        entityType: d.entity_type || '',
        entityId: d.entity_id || '',
        uploadedBy: d.uploaded_by,
        createdAt: d.created_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const uploadDocument = async (file: File, entityType: string, entityId: string) => {
    if (!user) return;

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: 'Upload Error', description: uploadError.message, variant: 'destructive' });
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    const { error } = await supabase.from('documents').insert({
      name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by: user.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Document uploaded' });
      fetchDocuments();
    }
  };

  const deleteDocument = async (id: string, fileUrl: string) => {
    // Extract path from URL for storage deletion
    const pathMatch = fileUrl.match(/\/documents\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from('documents').remove([pathMatch[1]]);
    }

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Document deleted' });
      fetchDocuments();
    }
  };

  return { documents, loading, uploadDocument, deleteDocument };
}
