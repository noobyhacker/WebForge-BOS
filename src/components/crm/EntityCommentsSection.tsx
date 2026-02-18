import { useState } from 'react';
import { useEntityComments } from '@/hooks/useEntityComments';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EntityCommentsSectionProps {
  entityType: string;
  entityId: string;
}

export function EntityCommentsSection({ entityType, entityId }: EntityCommentsSectionProps) {
  const { user } = useAuth();
  const { comments, loading, addComment, deleteComment } = useEntityComments(entityType, entityId);
  const profilesMap = useProfilesMap();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    await addComment(content);
    setContent('');
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-4">Loading comments...</div>;

  return (
    <div className="space-y-4">
      {/* Comment list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first to comment.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className={cn(
              'p-3 rounded-lg border',
              c.userId === user?.id ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">
                  {profilesMap[c.userId] || 'Unknown'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                  {c.userId === user?.id && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => deleteComment(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment... (use @name to mention)"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] text-sm"
        />
        <Button size="icon" className="flex-shrink-0 h-[60px] w-10" disabled={!content.trim() || submitting} onClick={handleSubmit}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Press ⌘+Enter to send</p>
    </div>
  );
}
