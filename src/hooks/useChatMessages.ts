import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  client_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to?: string | null;
}

export function useChatMessages(clientId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

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
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  const sendMessage = useCallback(async (content: string, replyTo?: string) => {
    if (!user || !clientId || !content.trim()) return;
    const row: any = {
      client_id: clientId,
      sender_id: user.id,
      content: content.trim(),
    };
    if (replyTo) row.reply_to = replyTo;
    const { error } = await supabase.from('chat_messages' as any).insert(row);
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

/** Hook to get active chat client IDs for the current user */
export function useActiveChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<{ clientId: string; clientName: string; lastMessage: string; lastAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) { setChats([]); setLoading(false); return; }
    // Get clients the user has access to that have chat messages
    const { data: clientRows } = await supabase
      .from('clients' as any)
      .select('id, name')
      .is('deleted_at', null);
    
    if (!clientRows || clientRows.length === 0) { setChats([]); setLoading(false); return; }
    
    const clientIds = (clientRows as any[]).map(c => c.id);
    const clientMap = new Map((clientRows as any[]).map(c => [c.id, c.name]));

    // Get the latest message per client
    const { data: msgs } = await supabase
      .from('chat_messages' as any)
      .select('client_id, content, created_at')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!msgs || msgs.length === 0) { setChats([]); setLoading(false); return; }

    // Group by client, take latest
    const latestByClient = new Map<string, { content: string; created_at: string }>();
    for (const m of msgs as any[]) {
      if (!latestByClient.has(m.client_id)) {
        latestByClient.set(m.client_id, { content: m.content, created_at: m.created_at });
      }
    }

    const result = Array.from(latestByClient.entries())
      .map(([clientId, msg]) => ({
        clientId,
        clientName: clientMap.get(clientId) || 'Unknown',
        lastMessage: msg.content,
        lastAt: msg.created_at,
      }))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    setChats(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // Realtime: refresh when any new message comes in
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('active-chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => { fetchChats(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchChats]);

  return { chats, loading, refetch: fetchChats };
}
