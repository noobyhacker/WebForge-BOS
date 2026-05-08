import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Client, FollowUp, FollowUpStatus } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { PhoneCall } from 'lucide-react';

const COLD_CALL_LABEL: Record<string, string> = {
  not_called: 'Not called',
  callback: 'Callback',
  not_interested: 'Not interested',
  warm: 'Warm',
  interested: 'Interested',
  meeting_scheduled: 'Meeting scheduled',
};
import { StatusBadge } from './StatusBadge';
import { FollowUpItem } from './FollowUpItem';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Phone, Calendar, FileText, Plus, X, Pencil, Share2, UserPlus, Globe, Instagram } from 'lucide-react';
import { AddFollowUpDialog } from './AddFollowUpDialog';
import { EditFollowUpDialog } from './EditFollowUpDialog';
import { EditClientDialog } from './EditClientDialog';
import { ShareClientDialog } from './ShareClientDialog';
import { AssignClientDialog } from './AssignClientDialog';
import { ClientAssignmentSection } from './ClientAssignmentSection';
import { ClientChatPanel } from './ClientChatPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

interface ClientDetailsProps {
  client: Client;
  onClose: () => void;
  onUpdateFollowUp: (followUpId: string, status: FollowUpStatus) => void;
  onAddFollowUp: (followUp: { date: string; notes: string; type: 'call' | 'email' | 'meeting' | 'task'; status: FollowUpStatus }) => void;
  onEditFollowUp: (followUpId: string, updates: Partial<Omit<FollowUp, 'id' | 'clientId'>>) => void;
  onDeleteFollowUp: (followUpId: string) => void;
  onEditClient: (updates: Partial<Omit<Client, 'id' | 'createdAt' | 'followUps'>>) => void;
  onDeleteClient: () => void;
}

export function ClientDetails({ 
  client, 
  onClose, 
  onUpdateFollowUp, 
  onAddFollowUp, 
  onEditFollowUp, 
  onDeleteFollowUp,
  onEditClient,
  onDeleteClient,
}: ClientDetailsProps) {
  const { user, isAdmin, isSalesManager, hasPermission } = useAuth();
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [coldCall, setColdCall] = useState<{ status: string | null; lastAt: string | null; notes: string | null } | null>(null);
  const [coldHistory, setColdHistory] = useState<Array<{ id: string; from_status: string | null; to_status: string; note: string | null; created_at: string; changed_by_email: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: c }, { data: h }] = await Promise.all([
        supabase.from('clients').select('cold_call_status,cold_call_last_at,cold_call_notes').eq('id', client.id).maybeSingle(),
        supabase.from('cold_call_history').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      if (c) setColdCall({ status: (c as any).cold_call_status, lastAt: (c as any).cold_call_last_at, notes: (c as any).cold_call_notes });
      setColdHistory((h || []) as any);
    })();
    return () => { cancelled = true; };
  }, [client.id]);

  // Only owners and admins can share
  const canShare = isAdmin || client.userId === user?.id;
  const canAssign = isAdmin || isSalesManager || hasPermission('assign_clients');

  const sortedFollowUps = [...client.followUps].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const handleSaveFollowUp = (updates: { date: string; notes: string; type: 'call' | 'email' | 'meeting' | 'task'; status: FollowUpStatus }) => {
    if (editingFollowUp) {
      onEditFollowUp(editingFollowUp.id, updates);
      setEditingFollowUp(null);
    }
  };

  const handleDeleteFollowUp = () => {
    if (editingFollowUp) {
      onDeleteFollowUp(editingFollowUp.id);
      setEditingFollowUp(null);
    }
  };

  const handleDeleteClient = () => {
    onDeleteClient();
    onClose();
  };

  return (
    <div className="h-full flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">Client Details</h2>
        <div className="flex items-center gap-1">
          {canAssign && (
            <Button variant="ghost" size="icon" onClick={() => setShowAssignDialog(true)} title="Assign client">
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          {canShare && (
            <Button variant="ghost" size="icon" onClick={() => setShowShareDialog(true)} title="Share client">
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowEditClient(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">
              {client.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{client.name}</h3>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <Building2 className="h-4 w-4" />
              {client.company}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Contact Information
          </h4>
          <div className="space-y-2">
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{client.email}</span>
            </a>
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{client.phone}</span>
            </a>
            {client.website && (
              <a
                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{client.website}</span>
              </a>
            )}
            {client.instagram && (
              <a
                href={`https://instagram.com/${client.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <Instagram className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">@{client.instagram.replace('@', '')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Client Since</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Last Contact</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(client.lastContact).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Cold Call Pipeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <PhoneCall className="h-3.5 w-3.5" /> Cold Call Pipeline
          </h4>
          <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[11px]">
                {COLD_CALL_LABEL[coldCall?.status || 'not_called'] || 'Not called'}
              </Badge>
              {coldCall?.lastAt && (
                <span className="text-[11px] text-muted-foreground">
                  Last: {new Date(coldCall.lastAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {coldCall?.notes && <p className="text-xs text-muted-foreground">{coldCall.notes}</p>}
            {coldHistory.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  History ({coldHistory.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {coldHistory.map(h => (
                    <li key={h.id} className="flex flex-col p-1.5 rounded bg-background/60">
                      <span>
                        {COLD_CALL_LABEL[h.from_status || 'not_called'] || h.from_status || '—'} → {COLD_CALL_LABEL[h.to_status] || h.to_status}
                      </span>
                      <span className="text-muted-foreground/80">
                        {new Date(h.created_at).toLocaleString()} · {h.changed_by_email || 'system'}
                      </span>
                      {h.note && <span className="text-muted-foreground/80">{h.note}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
        {/* Notes */}
        {client.notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </h4>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground flex gap-2">
                <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {client.notes}
              </p>
            </div>
          </div>
        )}

        {/* Follow-ups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Follow-ups ({client.followUps.length})
            </h4>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowAddFollowUp(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          {sortedFollowUps.length > 0 ? (
            <div className="space-y-2">
              {sortedFollowUps.map((followUp) => (
                <FollowUpItem
                  key={followUp.id}
                  followUp={followUp}
                  onMarkComplete={(id) => onUpdateFollowUp(id, 'completed')}
                  onEdit={(f) => setEditingFollowUp(f)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No follow-ups scheduled
            </div>
          )}
        </div>

        {/* Assignment Section */}
        <ClientAssignmentSection clientId={client.id} onAssign={() => setShowAssignDialog(true)} />

        {/* Chat */}
        <div className="border rounded-lg overflow-hidden h-64">
          <ClientChatPanel clientId={client.id} clientName={client.name} />
        </div>
      </div>

      <AddFollowUpDialog
        open={showAddFollowUp}
        onOpenChange={setShowAddFollowUp}
        onAdd={(followUp) => {
          onAddFollowUp(followUp);
          setShowAddFollowUp(false);
        }}
      />

      <EditFollowUpDialog
        open={!!editingFollowUp}
        onOpenChange={(open) => !open && setEditingFollowUp(null)}
        followUp={editingFollowUp}
        onSave={handleSaveFollowUp}
        onDelete={handleDeleteFollowUp}
      />

      <EditClientDialog
        open={showEditClient}
        onOpenChange={setShowEditClient}
        client={client}
        onSave={onEditClient}
        onDelete={handleDeleteClient}
      />

      <ShareClientDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        clientId={client.id}
        clientName={client.name}
      />

      <AssignClientDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        clientId={client.id}
        clientName={client.name}
      />
    </div>
  );
}
