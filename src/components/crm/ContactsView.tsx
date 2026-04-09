import { useState } from 'react';
import { Contact } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, User, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { EntityDetailPanel } from './EntityDetailPanel';
import { useContacts } from '@/hooks/useContacts';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const statusBadgeVariant = (s: string) => {
  switch (s) {
    case 'active': return 'default' as const;
    case 'inactive': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

export function ContactsView() {
  const { contacts, addContact, updateContact, deleteContact } = useContacts();
  const { accounts } = useAccounts();
  const { getOwnerName, getOwnerRole } = useProfilesMap();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', accountId: '', status: 'prospect' as 'active' | 'inactive' | 'prospect', source: '', title: '' });

  const filtered = contacts.filter(c => {
    const matchSearch = `${c.firstName} ${c.lastName} ${c.email} ${c.accountName}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const currentSelected = selectedContact ? contacts.find(c => c.id === selectedContact.id) || null : null;
  const resetForm = () => setForm({ firstName: '', lastName: '', email: '', phone: '', accountId: '', status: 'prospect', source: '', title: '' });

  const handleAdd = async () => { await addContact({ ...form, accountId: form.accountId || undefined }); setShowAdd(false); resetForm(); };
  const handleEdit = (c: Contact) => {
    setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, accountId: c.accountId || '', status: c.status, source: c.source, title: c.title });
    setEditId(c.id);
  };
  const handleUpdate = () => { if (editId) { updateContact(editId, { ...form, accountId: form.accountId || undefined }); setEditId(null); resetForm(); } };

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><Label>Source</Label><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Website, Referral" /></div>
          <div>
            <Label>Account</Label>
            <Select value={form.accountId} onValueChange={v => setForm(f => ({ ...f, accountId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No account</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.firstName.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex h-full animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground text-sm">Manage individual contacts and link them to accounts.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Contact</Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 border-b mb-4">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                statusFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {filtered.length > 0 ? (
          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow
                    key={c.id}
                    className={cn('cursor-pointer', currentSelected?.id === c.id && 'bg-primary/5')}
                    onClick={() => setSelectedContact(c)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="truncate">{c.firstName} {c.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[120px]">{c.title || '—'}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[180px]">{c.email || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[120px]">{c.accountName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(c.status)} className="capitalize text-xs">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{getOwnerName(c.ownerId)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No contacts found</p>
          </div>
        )}
      </div>

      <div
        className={cn(
          'w-96 border-l bg-card flex-shrink-0 ml-4 transition-all duration-300 ease-out overflow-hidden',
          currentSelected
            ? 'max-w-[24rem] opacity-100 translate-x-0'
            : 'max-w-0 opacity-0 translate-x-full border-l-0 ml-0'
        )}
      >
        {currentSelected && (
          <EntityDetailPanel entityType="contact" entityId={currentSelected.id} entityName={`${currentSelected.firstName} ${currentSelected.lastName}`} onClose={() => setSelectedContact(null)}>
            <div className="space-y-1 text-sm">
              {currentSelected.email && <p className="text-muted-foreground">✉ {currentSelected.email}</p>}
              {currentSelected.phone && <p className="text-muted-foreground">☎ {currentSelected.phone}</p>}
              {currentSelected.accountName && <p className="text-muted-foreground">🏢 {currentSelected.accountName}</p>}
            </div>
          </EntityDetailPanel>
        )}
      </div>

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Contact')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Contact')}
      <ConfirmDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }} title="Delete Contact" description="Are you sure? This cannot be undone." onConfirm={() => { if (deleteId) { deleteContact(deleteId); setDeleteId(null); } }} />
    </div>
  );
}
