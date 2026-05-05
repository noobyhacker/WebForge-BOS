import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, PhoneCall, PhoneOff, Flame, ThermometerSun, CalendarClock, Clock, StickyNote, ChevronRight, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ColdCallStatus =
  | 'not_called'
  | 'not_interested'
  | 'warm'
  | 'interested'
  | 'meeting_scheduled'
  | 'callback';

interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  cold_call_status: ColdCallStatus;
  cold_call_last_at: string | null;
  cold_call_notes: string | null;
}

const OUTCOMES: {
  key: ColdCallStatus;
  label: string;
  icon: typeof Phone;
  tone: string;
}[] = [
  { key: 'not_interested', label: 'Not interested', icon: PhoneOff, tone: 'bg-muted hover:bg-muted/80 text-foreground' },
  { key: 'callback', label: 'Callback later', icon: Clock, tone: 'bg-muted hover:bg-muted/80 text-foreground' },
  { key: 'warm', label: 'Warm', icon: ThermometerSun, tone: 'bg-muted hover:bg-muted/80 text-foreground' },
  { key: 'interested', label: 'Interested', icon: Flame, tone: 'bg-muted hover:bg-muted/80 text-foreground' },
  { key: 'meeting_scheduled', label: 'Meeting scheduled', icon: CalendarClock, tone: 'bg-muted hover:bg-muted/80 text-foreground' },
];

export function ColdCallView() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id,name,company,phone,email,cold_call_status,cold_call_last_at,cold_call_notes')
      .is('deleted_at', null)
      .order('cold_call_last_at', { ascending: true, nullsFirst: true })
      .limit(500);
    if (error) {
      toast.error('Failed to load leads');
    } else {
      setLeads((data || []) as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchLeads();
  }, [user]);

  const queue = useMemo(() => {
    const q = leads.filter(l => (l.cold_call_status ?? 'not_called') === 'not_called' || (l.cold_call_status ?? '') === 'callback');
    if (!search.trim()) return q;
    const s = search.toLowerCase();
    return q.filter(l =>
      l.name?.toLowerCase().includes(s) ||
      l.company?.toLowerCase().includes(s) ||
      l.phone?.toLowerCase().includes(s)
    );
  }, [leads, search]);

  const active = useMemo(() => leads.find(l => l.id === activeId) || null, [leads, activeId]);

  const startCall = (id: string) => {
    setActiveId(id);
    setCustomNote('');
  };

  const recordOutcome = async (status: ColdCallStatus, noteOverride?: string) => {
    if (!active || !user) return;
    setSaving(true);
    const note = noteOverride !== undefined ? noteOverride : customNote;
    const updates: Record<string, unknown> = {
      cold_call_status: status,
      cold_call_last_at: new Date().toISOString(),
    };
    if (note?.trim()) updates.cold_call_notes = note.trim();

    const { error } = await supabase.from('clients').update(updates).eq('id', active.id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    await supabase.from('action_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action_type: 'update',
      entity_type: 'client',
      entity_id: active.id,
      entity_name: active.name,
      details: `Cold call outcome: ${status}${note?.trim() ? ` — ${note.trim()}` : ''}`,
    });

    toast.success(`Logged: ${status.replace('_', ' ')}`);

    // Update local state and advance
    const remaining = queue.filter(l => l.id !== active.id);
    setLeads(prev => prev.map(l => l.id === active.id ? { ...l, ...updates } as Lead : l));
    setCustomNote('');
    setActiveId(remaining[0]?.id ?? null);
    setSaving(false);
  };

  const saveCustomNote = async () => {
    if (!active || !customNote.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        cold_call_notes: customNote.trim(),
        cold_call_last_at: new Date().toISOString(),
      })
      .eq('id', active.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Note saved');
    setLeads(prev => prev.map(l => l.id === active.id
      ? { ...l, cold_call_notes: customNote.trim(), cold_call_last_at: new Date().toISOString() }
      : l));
    setCustomNote('');
  };

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-4rem)] flex flex-col gap-3 p-3 sm:p-4 md:p-6 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2 truncate">
            <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">Cold Calling</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Work the queue. One click per outcome.</p>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs flex-shrink-0">
          {queue.length} in queue
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr] gap-3 flex-1 min-h-0">
        {/* Queue */}
        <Card className="flex flex-col min-h-0 bg-card/50">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search queue…"
                className="pl-8 h-9 bg-background/60"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full">
              <div className="px-2 pb-2 space-y-1">
                {loading && <p className="text-xs text-muted-foreground p-3">Loading…</p>}
                {!loading && queue.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3">Queue is clear.</p>
                )}
                {queue.map(l => (
                  <button
                    key={l.id}
                    onClick={() => startCall(l.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-md transition-colors group flex items-start gap-2',
                      activeId === l.id
                        ? 'bg-muted text-foreground'
                        : 'hover:bg-muted/50 text-foreground/90'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.company || '—'} · {l.phone || 'no phone'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 mt-1 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Active call */}
        <Card className="flex flex-col min-h-0 bg-card/50">
          {!active ? (
            <CardContent className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
              <Phone className="h-10 w-10 opacity-30" />
              <p className="text-sm">Select a lead from the queue to start a call.</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-xl truncate">{active.name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {active.company || '—'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setActiveId(null)} className="flex-shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pt-2">
                  {active.phone && (
                    <a href={`tel:${active.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" /> {active.phone}
                    </a>
                  )}
                  {active.email && <span className="truncate">{active.email}</span>}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 p-4 md:p-6 min-h-0 overflow-y-auto">
                {active.cold_call_notes && (
                  <div className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                    <span className="font-medium">Last note:</span> {active.cold_call_notes}
                  </div>
                )}

                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground/70 mb-2">Outcome</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                    {OUTCOMES.map(o => (
                      <Button
                        key={o.key}
                        disabled={saving}
                        onClick={() => recordOutcome(o.key)}
                        variant="outline"
                        className="h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-border/60 hover:border-border hover:bg-muted text-center"
                      >
                        <o.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[11px] sm:text-xs font-medium leading-tight">{o.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-2 flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Custom note (optional)
                  </p>
                  <Textarea
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    placeholder="Add a quick note. Saved with the next outcome, or save standalone."
                    rows={3}
                    className="bg-background/60 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving || !customNote.trim()}
                      onClick={saveCustomNote}
                    >
                      Save note only
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
