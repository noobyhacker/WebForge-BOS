import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PhoneOff, Clock, ThermometerSun, Flame, CalendarClock, Phone,
  Pencil, Trash2, History, ExternalLink, Save, Target, MessageSquarePlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';

type ColdCallStatus =
  | 'not_called' | 'not_interested' | 'warm' | 'interested' | 'meeting_scheduled' | 'callback';

interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  cold_call_status: ColdCallStatus | null;
  cold_call_last_at: string | null;
  cold_call_notes: string | null;
}

interface HistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by_email: string | null;
  created_at: string;
}

const COLUMNS: { key: ColdCallStatus; label: string; icon: typeof Phone }[] = [
  { key: 'not_called', label: 'Not called', icon: Phone },
  { key: 'callback', label: 'Callback', icon: Clock },
  { key: 'not_interested', label: 'Not interested', icon: PhoneOff },
  { key: 'warm', label: 'Warm', icon: ThermometerSun },
  { key: 'interested', label: 'Interested', icon: Flame },
  { key: 'meeting_scheduled', label: 'Meeting', icon: CalendarClock },
];

const statusLabel = (s: string | null | undefined) =>
  COLUMNS.find(c => c.key === s)?.label ?? (s ?? '—').replace(/_/g, ' ');

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // click without drag
        if (!isDragging) onOpen(lead);
        e.stopPropagation();
      }}
      className={cn(
        'w-full text-left p-2.5 rounded-md bg-background/60 hover:bg-muted transition-colors',
        'border border-border/40 hover:border-border cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-40'
      )}
    >
      <div className="text-sm font-medium truncate">{lead.name}</div>
      <div className="text-xs text-muted-foreground truncate">{lead.company || '—'}</div>
      {lead.cold_call_notes && (
        <div className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2">{lead.cold_call_notes}</div>
      )}
    </div>
  );
}

function Column({
  col, items, loading, onOpen,
}: {
  col: typeof COLUMNS[number];
  items: Lead[];
  loading: boolean;
  onOpen: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.key}` });
  return (
    <Card ref={setNodeRef} className={cn('flex flex-col min-h-0 bg-card/50 transition-colors', isOver && 'bg-muted/40 ring-1 ring-border')}>
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
          <div className="px-2 pb-2 space-y-1.5 min-h-[60px]">
            {loading && <p className="text-xs text-muted-foreground p-2">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="text-xs text-muted-foreground/60 p-2">Drop here</p>
            )}
            {items.map(l => <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function ColdCallPipelineView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [opened, setOpened] = useState<Lead | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Meeting / outcome note
  const [meetingNote, setMeetingNote] = useState('');
  const [meetingNewStatus, setMeetingNewStatus] = useState<ColdCallStatus | 'keep'>('keep');
  const [logging, setLogging] = useState(false);

  // Convert to deal
  const [convertOpen, setConvertOpen] = useState(false);
  const [dealName, setDealName] = useState('');
  const [dealValue, setDealValue] = useState<string>('0');
  const [dealStage, setDealStage] = useState<string>('prospecting');
  const [converting, setConverting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id,name,company,phone,email,notes,cold_call_status,cold_call_last_at,cold_call_notes')
      .is('deleted_at', null)
      .order('cold_call_last_at', { ascending: false, nullsFirst: false })
      .limit(1000);
    setLeads((data || []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchLeads(); }, [user]);

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

  const draggingLead = useMemo(() => leads.find(l => l.id === activeDragId) || null, [leads, activeDragId]);

  const moveLead = async (leadId: string, to: ColdCallStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const from = (lead.cold_call_status ?? 'not_called') as ColdCallStatus;
    if (from === to) return;
    // optimistic
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, cold_call_status: to, cold_call_last_at: new Date().toISOString() } : l));
    const { error } = await supabase
      .from('clients')
      .update({ cold_call_status: to, cold_call_last_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) {
      toast.error(error.message);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, cold_call_status: from } : l));
      return;
    }
    if (user) {
      await supabase.from('cold_call_history').insert({
        client_id: leadId, from_status: from, to_status: to,
        changed_by: user.id, changed_by_email: user.email || null, note: '',
      });
    }
    toast.success(`Moved to ${statusLabel(to)}`);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const overId = e.over?.id ? String(e.over.id) : '';
    if (!overId.startsWith('col:')) return;
    const to = overId.slice(4) as ColdCallStatus;
    moveLead(String(e.active.id), to);
  };

  const openLead = async (l: Lead) => {
    setOpened(l);
    setEditForm({ name: l.name, company: l.company, phone: l.phone, email: l.email, notes: l.notes, cold_call_notes: l.cold_call_notes });
    setMeetingNote('');
    setMeetingNewStatus('keep');
    setDealName(l.company ? `${l.company} – ${l.name}` : l.name);
    setDealValue('0');
    setDealStage('prospecting');
    const { data } = await supabase
      .from('cold_call_history')
      .select('*')
      .eq('client_id', l.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory((data || []) as HistoryRow[]);
  };

  const logMeetingNote = async () => {
    if (!opened || !user) return;
    if (!meetingNote.trim() && meetingNewStatus === 'keep') {
      toast.error('Add a note or pick a new status');
      return;
    }
    setLogging(true);
    const from = (opened.cold_call_status ?? 'not_called') as ColdCallStatus;
    const to = meetingNewStatus === 'keep' ? from : meetingNewStatus;
    const nowIso = new Date().toISOString();

    if (to !== from) {
      const { error: upErr } = await supabase.from('clients')
        .update({ cold_call_status: to, cold_call_last_at: nowIso })
        .eq('id', opened.id);
      if (upErr) { setLogging(false); return toast.error(upErr.message); }
      setLeads(prev => prev.map(l => l.id === opened.id ? { ...l, cold_call_status: to, cold_call_last_at: nowIso } : l));
      setOpened(prev => prev ? { ...prev, cold_call_status: to, cold_call_last_at: nowIso } : prev);
    }

    const { data: row, error } = await supabase.from('cold_call_history').insert({
      client_id: opened.id, from_status: from, to_status: to,
      changed_by: user.id, changed_by_email: user.email || null,
      note: meetingNote.trim(),
    }).select('*').single();
    setLogging(false);
    if (error) return toast.error(error.message);
    if (row) setHistory(prev => [row as HistoryRow, ...prev]);
    setMeetingNote('');
    setMeetingNewStatus('keep');
    toast.success('Note logged');
  };

  const convertToDeal = async () => {
    if (!opened) return;
    if (!dealName.trim()) return toast.error('Deal name required');
    setConverting(true);
    const { data, error } = await supabase.rpc('convert_lead_to_deal', {
      _lead_id: opened.id,
      _name: dealName.trim(),
      _value: Number(dealValue) || 0,
      _stage: dealStage,
    });
    setConverting(false);
    if (error) return toast.error(error.message);
    toast.success('Deal created');
    setConvertOpen(false);
    navigate(`/deals?selected=${data}`);
  };

  const saveEdit = async () => {
    if (!opened) return;
    setSaving(true);
    const { error } = await supabase.from('clients').update({
      name: editForm.name, company: editForm.company, phone: editForm.phone,
      email: editForm.email, notes: editForm.notes, cold_call_notes: editForm.cold_call_notes,
    }).eq('id', opened.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setLeads(prev => prev.map(l => l.id === opened.id ? { ...l, ...editForm } as Lead : l));
    setOpened(prev => prev ? { ...prev, ...editForm } as Lead : prev);
  };

  const deleteLead = async () => {
    if (!opened || !user) return;
    const { error } = await supabase.from('clients').update({
      deleted_at: new Date().toISOString(), deleted_by: user.id,
    }).eq('id', opened.id);
    if (error) return toast.error(error.message);
    toast.success('Lead deleted');
    setLeads(prev => prev.filter(l => l.id !== opened.id));
    setOpened(null);
    setConfirmDel(false);
  };

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-4rem)] flex flex-col p-3 sm:p-4 md:p-6 gap-3 min-w-0">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight truncate">Cold Call Pipeline</h1>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">Drag cards between columns. Click to edit, view history, or delete.</p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="grid grid-flow-col auto-cols-[78vw] sm:auto-cols-[260px] lg:auto-cols-[minmax(220px,1fr)] gap-2.5 h-full pb-2">
            {COLUMNS.map(col => (
              <Column key={col.key} col={col} items={grouped[col.key] || []} loading={loading} onOpen={openLead} />
            ))}
          </div>
        </div>
        <DragOverlay>
          {draggingLead && (
            <div className="p-2.5 rounded-md bg-background border border-border shadow-lg w-[240px]">
              <div className="text-sm font-medium truncate">{draggingLead.name}</div>
              <div className="text-xs text-muted-foreground truncate">{draggingLead.company || '—'}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Sheet open={!!opened} onOpenChange={(o) => !o && setOpened(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {opened && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="truncate flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit Lead
                  </SheetTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">{statusLabel(opened.cold_call_status)}</Badge>
                </div>
              </SheetHeader>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Company</Label>
                  <Input value={editForm.company || ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Cold call notes</Label>
                  <Textarea rows={2} value={editForm.cold_call_notes || ''} onChange={e => setEditForm(f => ({ ...f, cold_call_notes: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">General notes</Label>
                  <Textarea rows={3} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="default" onClick={() => setConvertOpen(true)} className="gap-1.5 bg-primary/90 hover:bg-primary">
                    <Target className="h-3.5 w-3.5" /> Convert to Deal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/clients?selected=${opened.id}`)} className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmDel(true)} className="gap-1.5 ml-auto">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/50 space-y-2">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquarePlus className="h-3.5 w-3.5" /> Log meeting / outcome note
                  </h4>
                  <Textarea
                    rows={2}
                    placeholder="What was discussed? Next steps, objections, decisions…"
                    value={meetingNote}
                    onChange={e => setMeetingNote(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Set stage:</Label>
                    <Select value={meetingNewStatus} onValueChange={(v) => setMeetingNewStatus(v as ColdCallStatus | 'keep')}>
                      <SelectTrigger className="h-8 text-xs w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Keep current</SelectItem>
                        {COLUMNS.map(c => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={logMeetingNote} disabled={logging} className="ml-auto gap-1.5">
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Log
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Pipeline history
                  </h4>
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70">No status changes yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {history.map(h => (
                        <li key={h.id} className="text-xs flex items-start gap-2 p-2 rounded bg-muted/40">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {statusLabel(h.from_status)} <span className="text-muted-foreground">→</span> {statusLabel(h.to_status)}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(h.created_at).toLocaleString()} · {h.changed_by_email || 'system'}
                            </div>
                            {h.note && <div className="text-muted-foreground/80 mt-0.5">{h.note}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete this lead?"
        description="The lead will be moved to Trash. This can be restored by an admin."
        confirmText="Delete"
        onConfirm={deleteLead}
      />
    </div>
  );
}
