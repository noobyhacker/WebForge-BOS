import { useState } from 'react';
import { Contact, Account } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Mail, Phone, Building2, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';

interface ContactsViewProps {
  contacts: Contact[];
  accounts: Account[];
  onAdd: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'accountName'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Contact>) => void;
  onDelete: (id: string) => void;
}

export function ContactsView({ contacts, accounts, onAdd, onUpdate, onDelete }: ContactsViewProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ firstName: string; lastName: string; email: string; phone: string; accountId: string; status: 'active' | 'inactive' | 'prospect'; source: string; title: string }>({ firstName: '', lastName: '', email: '', phone: '', accountId: '', status: 'prospect', source: '', title: '' });

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.accountName}`.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => setForm({ firstName: '', lastName: '', email: '', phone: '', accountId: '', status: 'prospect', source: '', title: '' });

  const handleAdd = async () => {
    await onAdd({ ...form, accountId: form.accountId || undefined });
    setShowAdd(false);
    resetForm();
  };

  const handleEdit = (c: Contact) => {
    setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, accountId: c.accountId || '', status: c.status, source: c.source, title: c.title });
    setEditId(c.id);
  };

  const handleUpdate = () => {
    if (editId) {
      onUpdate(editId, { ...form, accountId: form.accountId || undefined });
      setEditId(null);
      resetForm();
    }
  };

  const statusColor = (s: string) => s === 'active' ? 'default' : s === 'inactive' ? 'secondary' : 'outline';

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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage individual contacts and link them to accounts.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Contact</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.firstName} {c.lastName}</p>
                      {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                    </div>
                  </div>
                  <Badge variant={statusColor(c.status)}>{c.status}</Badge>
                </div>
                {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Mail className="h-3 w-3" />{c.email}</p>}
                {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                {c.accountName && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{c.accountName}</p>}
                <div className="flex gap-1 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No contacts found</p>
        </div>
      )}

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Contact')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Contact')}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete Contact"
        description="Are you sure? This cannot be undone."
        onConfirm={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
