import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientAssignment {
  id: string;
  client_id: string;
  assigned_to: string;
  assigned_by: string;
  pinned_notes: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentFile {
  id: string;
  assignment_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export function useClientAssignments(clientId?: string) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [files, setFiles] = useState<AssignmentFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('client_assignments' as any).select('*').order('created_at', { ascending: false });
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      const { data, error } = await query;
      if (error) { console.error('Error fetching assignments:', error); return; }
      setAssignments((data || []) as unknown as ClientAssignment[]);

      // Fetch files for these assignments
      if (data && data.length > 0) {
        const ids = data.map((a: any) => a.id);
        const { data: filesData } = await supabase
          .from('client_assignment_files' as any)
          .select('*')
          .in('assignment_id', ids)
          .order('created_at', { ascending: false });
        setFiles((filesData || []) as unknown as AssignmentFile[]);
      } else {
        setFiles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, clientId]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const assignClient = useCallback(async (targetClientId: string, assignedTo: string, pinnedNotes: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('client_assignments' as any)
      .insert({ client_id: targetClientId, assigned_to: assignedTo, assigned_by: user.id, pinned_notes: pinnedNotes })
      .select()
      .single();
    if (error) { console.error('Error assigning client:', error); throw error; }
    await fetchAssignments();
    return data as unknown as ClientAssignment;
  }, [user, fetchAssignments]);

  const updateAssignment = useCallback(async (id: string, updates: { pinned_notes?: string; assigned_to?: string }) => {
    if (!user) return;
    const { error } = await supabase
      .from('client_assignments' as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('Error updating assignment:', error); throw error; }
    await fetchAssignments();
  }, [user, fetchAssignments]);

  const removeAssignment = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('client_assignments' as any).delete().eq('id', id);
    if (error) { console.error('Error removing assignment:', error); throw error; }
    await fetchAssignments();
  }, [user, fetchAssignments]);

  const uploadFile = useCallback(async (assignmentId: string, file: File) => {
    if (!user) return;
    const filePath = `${user.id}/${assignmentId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('assignment-files')
      .upload(filePath, file);
    if (uploadError) { console.error('Error uploading file:', uploadError); throw uploadError; }

    const { data: urlData } = supabase.storage.from('assignment-files').getPublicUrl(filePath);

    const { error } = await supabase.from('client_assignment_files' as any).insert({
      assignment_id: assignmentId,
      file_name: file.name,
      file_url: urlData.publicUrl || filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    });
    if (error) { console.error('Error saving file record:', error); throw error; }
    await fetchAssignments();
  }, [user, fetchAssignments]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (!user) return;
    const { error } = await supabase.from('client_assignment_files' as any).delete().eq('id', fileId);
    if (error) { console.error('Error deleting file:', error); throw error; }
    await fetchAssignments();
  }, [user, fetchAssignments]);

  return { assignments, files, loading, assignClient, updateAssignment, removeAssignment, uploadFile, deleteFile, refetch: fetchAssignments };
}
