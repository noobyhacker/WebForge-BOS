import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EntityComment {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export function useEntityComments(entityType: string, entityId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!entityId) return;
    const { data, error } = await supabase
      .from('entity_comments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (error) { console.error('Error fetching comments:', error); return; }
    setComments((data || []).map(r => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      userId: r.user_id,
      content: r.content,
      createdAt: r.created_at,
    })));
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return;
    const { error } = await supabase.from('entity_comments').insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      content: content.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to add comment.', variant: 'destructive' });
      return;
    }

    // Parse @mentions and create notifications
    const mentions = content.match(/@(\S+)/g);
    if (mentions) {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      for (const mention of mentions) {
        const name = mention.slice(1).toLowerCase();
        const match = profiles?.find(p =>
          p.email.toLowerCase().includes(name) ||
          (p.full_name && p.full_name.toLowerCase().includes(name))
        );
        if (match && match.id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: match.id,
            title: 'You were mentioned',
            message: `${user.email} mentioned you in a comment on ${entityType} ${entityId.slice(0, 8)}`,
            type: 'mention',
            entity_type: entityType,
            entity_id: entityId,
          });
        }
      }
    }

    await fetchComments();
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from('entity_comments').delete().eq('id', commentId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete comment.', variant: 'destructive' });
      return;
    }
    await fetchComments();
  };

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}
