import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useClients } from '@/hooks/useClients';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useClientAssignments } from '@/hooks/useClientAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

export function BulkAssignView() {
  const { profile, isAdmin, isSalesManager, hasPermission } = useAuth();
  const { clients } = useClients(profile?.email || '');
  const { profiles } = useProfilesMap();
  const { assignClient } = useClientAssignments();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canAssign = isAdmin || isSalesManager || hasPermission('assign_clients');
  if (!canAssign) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You don't have permission to assign clients.</p>
      </div>
    );
  }

  const profilesList = Object.entries(profiles).map(([id, p]) => ({ id, ...p }));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === clients.length) setSelected(new Set());
    else setSelected(new Set(clients.map(c => c.id)));
  };

  const handleBulkAssign = async () => {
    if (!assignedTo) { toast.error('Select a sales assistant'); return; }
    if (selected.size === 0) { toast.error('Select at least one client'); return; }
    setSubmitting(true);
    try {
      for (const clientId of selected) {
        await assignClient(clientId, assignedTo, notes);
      }
      toast.success(`${selected.size} client(s) assigned successfully`);
      setSelected(new Set());
      setAssignedTo('');
      setNotes('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          Bulk Client Assignment
        </h1>
        <p className="text-muted-foreground text-sm">Assign multiple clients to a sales assistant at once.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Assign To</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Select sales assistant..." /></SelectTrigger>
            <SelectContent>
              {profilesList.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Pinned notes for all..." rows={2} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleBulkAssign} disabled={submitting || selected.size === 0} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Assigning...' : `Assign ${selected.size} Client(s)`}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center gap-3 p-3 bg-secondary/30 border-b text-sm font-medium">
          <Checkbox checked={selected.size === clients.length && clients.length > 0} onCheckedChange={toggleAll} />
          <span className="flex-1">Client</span>
          <span className="w-32">Company</span>
          <span className="w-24">Status</span>
          <span className="w-24">Language</span>
        </div>
        <div className="max-h-[50vh] overflow-auto">
          {clients.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-secondary/20 cursor-pointer"
              onClick={() => toggleSelect(c.id)}
            >
              <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
              <span className="flex-1 truncate text-sm">{c.name}</span>
              <span className="w-32 truncate text-sm text-muted-foreground">{c.company}</span>
              <span className="w-24 text-xs capitalize">{c.status}</span>
              <span className="w-24 text-xs">{c.language || '—'}</span>
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No clients found</p>
          )}
        </div>
      </div>
    </div>
  );
}
