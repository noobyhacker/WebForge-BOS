import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FollowUp, FollowUpStatus } from '@/types/crm';
import { ConfirmDialog } from './ConfirmDialog';

interface EditFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUp | null;
  onSave: (updates: {
    date: string;
    notes: string;
    type: 'call' | 'email' | 'meeting' | 'task';
    status: FollowUpStatus;
  }) => void;
  onDelete: () => void;
}

export function EditFollowUpDialog({ open, onOpenChange, followUp, onSave, onDelete }: EditFollowUpDialogProps) {
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'call' | 'email' | 'meeting' | 'task'>('call');
  const [status, setStatus] = useState<FollowUpStatus>('scheduled');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (followUp) {
      setDate(followUp.date);
      setNotes(followUp.notes);
      setType(followUp.type);
      setStatus(followUp.status);
    }
  }, [followUp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !notes) return;

    onSave({
      date,
      notes,
      type,
      status,
    });
  };

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
    setShowDeleteConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Follow-up</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as FollowUpStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the follow-up..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
