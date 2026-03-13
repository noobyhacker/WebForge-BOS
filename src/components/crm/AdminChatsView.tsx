import { useState, useMemo } from 'react';
import { useAllChatMessages } from '@/hooks/useChatMessages';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export function AdminChatsView() {
  const { isAdmin } = useAuth();
  const { messages, loading } = useAllChatMessages();
  const profiles = useProfilesMap();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  // Fetch client names for display
  useEffect(() => {
    const clientIds = [...new Set(messages.map(m => m.client_id))];
    if (clientIds.length === 0) return;
    supabase.from('clients').select('id, name').in('id', clientIds).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(c => { map[c.id] = c.name; });
        setClientNames(map);
      }
    });
  }, [messages]);

  const uniqueClients = useMemo(() => {
    const ids = [...new Set(messages.map(m => m.client_id))];
    return ids.map(id => ({ id, name: clientNames[id] || id.slice(0, 8) }));
  }, [messages, clientNames]);

  const filtered = useMemo(() => {
    return messages.filter(m => {
      const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClient = clientFilter === 'all' || m.client_id === clientFilter;
      return matchesSearch && matchesClient;
    });
  }, [messages, searchQuery, clientFilter]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          All Chats
        </h1>
        <p className="text-muted-foreground text-sm">Monitor all client conversations across the team.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {uniqueClients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading messages...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No messages found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 p-3 bg-secondary/30 border-b text-xs font-medium text-muted-foreground">
            <span>Client</span>
            <span>Sender</span>
            <span>Message</span>
            <span>Time</span>
          </div>
          <div className="max-h-[60vh] overflow-auto divide-y">
            {filtered.map(m => {
              const sender = profiles[m.sender_id];
              return (
                <div key={m.id} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 p-3 text-sm hover:bg-secondary/10">
                  <span className="truncate text-muted-foreground">{clientNames[m.client_id] || m.client_id.slice(0, 8)}</span>
                  <span className="truncate">{sender?.full_name || sender?.email || 'Unknown'}</span>
                  <span className="truncate">{m.content}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
