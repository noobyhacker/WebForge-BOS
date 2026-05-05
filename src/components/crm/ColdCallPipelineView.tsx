import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhoneOff, Clock, ThermometerSun, Flame, CalendarClock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  cold_call_status: ColdCallStatus | null;
  cold_call_last_at: string | null;
  cold_call_notes: string | null;
}

const COLUMNS: { key: ColdCallStatus; label: string; icon: typeof Phone }[] = [
  { key: 'not_called', label: 'Not called', icon: Phone },
  { key: 'callback', label: 'Callback', icon: Clock },
  { key: 'not_interested', label: 'Not interested', icon: PhoneOff },
  { key: 'warm', label: 'Warm', icon: ThermometerSun },
  { key: 'interested', label: 'Interested', icon: Flame },
  { key: 'meeting_scheduled', label: 'Meeting scheduled', icon: CalendarClock },
];

export function ColdCallPipelineView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('clients')
        .select('id,name,company,phone,cold_call_status,cold_call_last_at,cold_call_notes')
        .is('deleted_at', null)
        .order('cold_call_last_at', { ascending: false, nullsFirst: false })
        .limit(1000);
      setLeads((data || []) as Lead[]);
      setLoading(false);
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const g: Record<ColdCallStatus, Lead[]> = {
      not_called: [], not_interested: [], warm: [], interested: [], meeting_scheduled: [], callback: [],
    };
    for (const l of leads) {
      const k = (l.cold_call_status ?? 'not_called') as ColdCallStatus;
      if (g[k]) g[k].push(l);
    }
    return g;
  }, [leads]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cold Call Pipeline</h1>
        <p className="text-sm text-muted-foreground">Leads grouped by their latest call outcome.</p>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 h-full pb-2">
          {COLUMNS.map(col => {
            const items = grouped[col.key] || [];
            return (
              <Card key={col.key} className="flex flex-col min-h-0 bg-card/50">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <col.icon className="h-3.5 w-3.5" />
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0">
                  <ScrollArea className="h-full">
                    <div className="px-2 pb-2 space-y-1.5">
                      {loading && <p className="text-xs text-muted-foreground p-2">Loading…</p>}
                      {!loading && items.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 p-2">Empty</p>
                      )}
                      {items.map(l => (
                        <button
                          key={l.id}
                          onClick={() => navigate(`/clients?selected=${l.id}`)}
                          className={cn(
                            'w-full text-left p-2.5 rounded-md bg-background/60 hover:bg-muted transition-colors',
                            'border border-border/40 hover:border-border'
                          )}
                        >
                          <div className="text-sm font-medium truncate">{l.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {l.company || '—'}
                          </div>
                          {l.cold_call_notes && (
                            <div className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2">
                              {l.cold_call_notes}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
