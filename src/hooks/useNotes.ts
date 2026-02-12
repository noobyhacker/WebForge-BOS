import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Note } from '@/types/phase3';

export function useNotes(entityType: string, entityId: string) {
  const { user, isApproved } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user || !isApproved || !entityId) { setNotes([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*, profiles(email)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching notes:', error); return; }
      setNotes((data || []).map((n: any) => ({
        id: n.id,
        entityType: n.entity_type,
        entityId: n.entity_id,
        content: n.content,
        authorId: n.author_id,
        authorEmail: n.profiles?.email || '',
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved, entityType, entityId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const addNote = useCallback(async (content: string) => {
    if (!user || !entityId) return;
    const { error } = await supabase.from('notes').insert({
      entity_type: entityType,
      entity_id: entityId,
      content,
      author_id: user.id,
    });
    if (error) { console.error('Error adding note:', error); throw error; }
    await fetchNotes();
  }, [user, entityType, entityId, fetchNotes]);

  const deleteNote = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { console.error('Error deleting note:', error); return; }
    await fetchNotes();
  }, [user, fetchNotes]);

  return { notes, loading, addNote, deleteNote, refetch: fetchNotes };
}
