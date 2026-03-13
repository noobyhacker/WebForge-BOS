import { useState, useRef, useEffect } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ClientChatPanelProps {
  clientId: string;
  clientName: string;
}

export function ClientChatPanel({ clientId, clientName }: ClientChatPanelProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChatMessages(clientId);
  const profiles = useProfilesMap();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch {
      // error handled in hook
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Chat — {clientName}</h4>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const senderProfile = profiles[msg.sender_id];
            const senderName = senderProfile?.full_name || senderProfile?.email || 'Unknown';
            return (
              <div key={msg.id} className={cn('flex flex-col max-w-[85%]', isMe ? 'ml-auto items-end' : 'items-start')}>
                <span className="text-[10px] text-muted-foreground mb-0.5 px-1">{senderName}</span>
                <div className={cn(
                  'rounded-lg px-3 py-2 text-sm break-words',
                  isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
