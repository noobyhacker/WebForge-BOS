import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  client_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function useChatMessages(clientId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !clientId) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      if (error) { console.error('Error fetching messages:', error); return; }
      setMessages((data || []) as unknown as ChatMessage[]);
    } finally {
      setLoading(false);
    }
  }, [user, clientId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`chat-${clientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `client_id=eq.${clientId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as unknown as ChatMessage]);
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !clientId || !content.trim()) return;
    const { error } = await supabase.from('chat_messages' as any).insert({
      client_id: clientId,
      sender_id: user.id,
      content: content.trim(),
    });
    if (error) { console.error('Error sending message:', error); throw error; }
  }, [user, clientId]);

  return { messages, loading, sendMessage, refetch: fetchMessages };
}

// Hook for admin to see all chat messages across clients
export function useAllChatMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) { console.error('Error fetching all messages:', error); return; }
      setMessages((data || []) as unknown as ChatMessage[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { messages, loading, refetch: fetchAll };
}
