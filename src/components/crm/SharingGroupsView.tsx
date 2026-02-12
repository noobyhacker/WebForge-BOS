import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, UsersRound, UserPlus } from 'lucide-react';
import type { SharingGroup } from '@/types/phase7';

interface Props {
  groups: SharingGroup[];
  onAdd: (group: { name: string; description: string; memberIds: string[] }) => void;
  onUpdate: (id: string, updates: Partial<SharingGroup>) => void;
  onDelete: (id: string) => void;
}

export function SharingGroupsView({ groups, onAdd, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addMemberInput, setAddMemberInput] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    const memberIds = memberInput.split(',').map(s => s.trim()).filter(Boolean);
    onAdd({ name, description, memberIds });
    setName('');
    setDescription('');
    setMemberInput('');
    setDialogOpen(false);
  };

  const handleAddMember = (groupId: string, currentMembers: string[]) => {
    if (!addMemberInput.trim()) return;
    const newMembers = [...currentMembers, addMemberInput.trim()];
    onUpdate(groupId, { memberIds: newMembers });
    setAddMemberInput('');
    setEditingId(null);
  };

  const handleRemoveMember = (groupId: string, currentMembers: string[], memberId: string) => {
    onUpdate(groupId, { memberIds: currentMembers.filter(m => m !== memberId) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="h-6 w-6 text-primary" />
            Sharing Groups
          </h1>
          <p className="text-muted-foreground mt-1">Create teams for bulk record sharing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Sharing Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Group Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sales Team" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this group for?" />
              </div>
              <div>
                <Label>Member User IDs (comma-separated)</Label>
                <Textarea value={memberInput} onChange={e => setMemberInput(e.target.value)} placeholder="Paste user IDs separated by commas" />
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!name.trim()}>Create Group</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No sharing groups</h3>
            <p className="text-muted-foreground mt-1">Create groups to share records with teams</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <Card key={group.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{group.name}</h3>
                    {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(group.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Members ({group.memberIds.length})</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.memberIds.map(id => (
                      <Badge key={id} variant="secondary" className="text-xs cursor-pointer" onClick={() => handleRemoveMember(group.id, group.memberIds, id)}>
                        {id.substring(0, 8)}… ✕
                      </Badge>
                    ))}
                    {editingId === group.id ? (
                      <div className="flex gap-1 items-center">
                        <Input
                          className="h-6 text-xs w-48"
                          value={addMemberInput}
                          onChange={e => setAddMemberInput(e.target.value)}
                          placeholder="User ID"
                          onKeyDown={e => e.key === 'Enter' && handleAddMember(group.id, group.memberIds)}
                        />
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => handleAddMember(group.id, group.memberIds)}>Add</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setEditingId(group.id)}>
                        <UserPlus className="h-3 w-3 mr-1" />Add
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
