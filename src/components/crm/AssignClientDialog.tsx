import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { useClientAssignments } from '@/hooks/useClientAssignments';
import { Upload, X, FileIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AssignClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function AssignClientDialog({ open, onOpenChange, clientId, clientName }: AssignClientDialogProps) {
  const [assignedTo, setAssignedTo] = useState('');
  const [pinnedNotes, setPinnedNotes] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profiles = useProfilesMap();
  const { assignClient, uploadFile } = useClientAssignments(clientId);

  const profilesList = Object.entries(profiles).map(([id, p]) => ({ id, ...p }));

  const handleSubmit = async () => {
    if (!assignedTo) { toast.error('Please select a sales assistant'); return; }
    setSubmitting(true);
    try {
      const assignment = await assignClient(clientId, assignedTo, pinnedNotes);
      if (assignment && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          await uploadFile(assignment.id, file);
        }
      }
      toast.success(`${clientName} assigned successfully`);
      setAssignedTo('');
      setPinnedNotes('');
      setPendingFiles([]);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign client');
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Client: {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Label>Pinned Notes</Label>
            <Textarea
              placeholder="Add important info about this client for the sales assistant..."
              value={pinnedNotes}
              onChange={e => setPinnedNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Attach Files</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Files
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) {
                    setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />
            </div>
            {pendingFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-secondary/50">
                    <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{file.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeFile(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
