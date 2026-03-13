import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatMessages, ChatMessage } from '@/hooks/useChatMessages';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Reply, X, Paperclip, FileIcon, Image, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ClientChatPanelProps {
  clientId: string;
  clientName: string;
}

export function ClientChatPanel({ clientId, clientName }: ClientChatPanelProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChatMessages(clientId);
  const { profiles } = useProfilesMap();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-files').upload(path, file);
    if (error) { console.error('Upload error:', error); return null; }
    return { url: path, name: file.name, type: file.type };
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingFile) || sending) return;
    setSending(true);
    setUploading(!!pendingFile);
    try {
      let fileData: { url: string; name: string; type: string } | null = null;
      if (pendingFile) {
        fileData = await uploadFile(pendingFile);
      }
      await sendMessage(newMessage || (pendingFile ? `📎 ${pendingFile.name}` : ''), replyTo?.id, fileData || undefined);
      setNewMessage('');
      setReplyTo(null);
      setPendingFile(null);
    } catch {
      // error handled in hook
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB');
        return;
      }
      setPendingFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getReplyPreview = (msg: ChatMessage) => {
    const repliedMsg = messages.find(m => m.id === msg.reply_to);
    if (!repliedMsg) return null;
    const senderProfile = profiles.get(repliedMsg.sender_id);
    const name = senderProfile?.fullName || senderProfile?.email || 'Unknown';
    return { name, content: repliedMsg.content };
  };

  const isImage = (type?: string | null) => type?.startsWith('image/');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b cursor-move" data-drag-handle>
        <MessageCircle className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium flex-1">Chat — {clientName}</h4>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const senderProfile = profiles.get(msg.sender_id);
            const senderName = senderProfile?.fullName || senderProfile?.email || 'Unknown';
            const replyPreview = msg.reply_to ? getReplyPreview(msg) : null;
            return (
              <div key={msg.id} className={cn('flex flex-col max-w-[85%] group', isMe ? 'ml-auto items-end' : 'items-start')}>
                <span className="text-[10px] text-muted-foreground mb-0.5 px-1">{senderName}</span>
                {replyPreview && (
                  <div className={cn(
                    'text-[11px] px-2 py-1 rounded-t-md border-l-2 mb-0.5 max-w-full truncate',
                    isMe ? 'border-primary-foreground/50 bg-primary/20 text-primary-foreground/70' : 'border-primary/50 bg-secondary/80 text-muted-foreground'
                  )}>
                    <span className="font-medium">{replyPreview.name}: </span>
                    {replyPreview.content.slice(0, 60)}{replyPreview.content.length > 60 ? '…' : ''}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {isMe && (
                    <button onClick={() => setReplyTo(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted" title="Reply">
                      <Reply className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  <div className={cn(
                    'rounded-lg px-3 py-2 text-sm break-words',
                    isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  )}>
                    {msg.file_url && <FileAttachment fileUrl={msg.file_url} fileName={msg.file_name} fileType={msg.file_type} getSignedUrl={getSignedUrl} />}
                    {msg.content && !(msg.file_url && msg.content.startsWith('📎')) && <span>{msg.content}</span>}
                  </div>
                  {!isMe && (
                    <button onClick={() => setReplyTo(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted" title="Reply">
                      <Reply className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="px-3 py-2 border-t bg-muted/50 flex items-center gap-2">
          <Reply className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 text-xs text-muted-foreground truncate">
            Replying to <span className="font-medium">{profiles.get(replyTo.sender_id)?.fullName || profiles.get(replyTo.sender_id)?.email || 'Unknown'}</span>: {replyTo.content.slice(0, 80)}
          </div>
          <button onClick={() => setReplyTo(null)} className="p-0.5 rounded hover:bg-muted"><X className="h-3 w-3 text-muted-foreground" /></button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="px-3 py-2 border-t bg-muted/50 flex items-center gap-2">
          <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-xs text-muted-foreground truncate">{pendingFile.name} ({(pendingFile.size / 1024).toFixed(0)} KB)</span>
          <button onClick={() => setPendingFile(null)} className="p-0.5 rounded hover:bg-muted"><X className="h-3 w-3 text-muted-foreground" /></button>
        </div>
      )}

      <div className="p-3 border-t flex gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
        <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} className="flex-shrink-0" title="Attach file">
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder={uploading ? 'Uploading...' : 'Type a message...'}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="flex-1"
          disabled={uploading}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || (!newMessage.trim() && !pendingFile)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Renders a file attachment with preview/download */
function FileAttachment({ fileUrl, fileName, fileType, getSignedUrl }: {
  fileUrl?: string | null; fileName?: string | null; fileType?: string | null;
  getSignedUrl: (path: string) => Promise<string>;
}) {
  const [signedUrl, setSignedUrl] = useState<string>('');

  useEffect(() => {
    if (fileUrl) {
      getSignedUrl(fileUrl).then(setSignedUrl);
    }
  }, [fileUrl]);

  if (!fileUrl || !signedUrl) return null;

  const isImg = fileType?.startsWith('image/');

  if (isImg) {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
        <img src={signedUrl} alt={fileName || 'image'} className="max-w-[200px] max-h-[150px] rounded object-cover" />
      </a>
    );
  }

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-1 hover:underline">
      <FileIcon className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs truncate">{fileName || 'File'}</span>
      <Download className="h-3 w-3 flex-shrink-0" />
    </a>
  );
}
