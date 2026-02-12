import { useState } from 'react';
import { Note } from '@/types/phase3';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send, StickyNote } from 'lucide-react';
import { format } from 'date-fns';

interface NotesListProps {
  notes: Note[];
  onAdd: (content: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function NotesList({ notes, onAdd, onDelete }: NotesListProps) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(draft.trim());
      setDraft('');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-3">
      {/* Add note */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note... Use @mention to tag users"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="min-h-[60px] text-sm"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
        />
        <Button size="icon" onClick={handleSubmit} disabled={!draft.trim() || submitting} className="flex-shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="bg-muted/50 rounded-lg p-3 group">
              <div className="flex items-start justify-between">
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={() => onDelete(n.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {n.authorEmail && <span className="font-medium">{n.authorEmail}</span>}
                {n.authorEmail && ' · '}
                {format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <StickyNote className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p>No notes yet</p>
        </div>
      )}
    </div>
  );
}
