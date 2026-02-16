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

  const getSignedUrl = async (fileUrl: string): Promise<string | null> => {
    // Extract the storage path from the file_url
    // If it's already a path (not a full URL), use it directly
    let storagePath = fileUrl;
    const pathMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/documents\/(.+)$/);
    if (pathMatch) {
      storagePath = pathMatch[1];
    }
    // Also handle if stored as just the path (user_id/timestamp_filename)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

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

    // Store the file path (not public URL) since bucket is private
    const { error } = await supabase.from('documents').insert({
      name: file.name,
      file_url: filePath,
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
    // Extract path from URL or use directly if stored as path
    let storagePath = fileUrl;
    const pathMatch = fileUrl.match(/\/documents\/(.+)$/);
    if (pathMatch) {
      storagePath = pathMatch[1];
    }
    await supabase.storage.from('documents').remove([storagePath]);

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Document deleted' });
      fetchDocuments();
    }
  };

  return { documents, loading, uploadDocument, deleteDocument, getSignedUrl };
}
