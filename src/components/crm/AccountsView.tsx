import { useState } from 'react';
import { Account } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Building2, Globe, Phone, MapPin, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { EntityDetailPanel } from './EntityDetailPanel';
import { useAccounts } from '@/hooks/useAccounts';

export function AccountsView() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: '', industry: '', website: '', phone: '', address: '' });

  const filtered = accounts.filter(a => `${a.name} ${a.industry}`.toLowerCase().includes(search.toLowerCase()));
  const currentSelected = selectedAccount ? accounts.find(a => a.id === selectedAccount.id) || null : null;
  const resetForm = () => setForm({ name: '', industry: '', website: '', phone: '', address: '' });

  const handleAdd = async () => { await addAccount(form); setShowAdd(false); resetForm(); };
  const handleEdit = (a: Account) => { setForm({ name: a.name, industry: a.industry, website: a.website, phone: a.phone, address: a.address }); setEditId(a.id); };
  const handleUpdate = () => { if (editId) { updateAccount(editId, form); setEditId(null); resetForm(); } };

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Company Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.name.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex h-full animate-fade-in">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">Companies and organizations you work with.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Account</Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto pb-4">
            {filtered.map(a => (
              <Card key={a.id} className={`hover:shadow-md transition-shadow cursor-pointer ${currentSelected?.id === a.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedAccount(a)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="font-semibold text-sm">{a.name}</p>
                        {a.industry && <p className="text-xs text-muted-foreground">{a.industry}</p>}
                      </div>
                    </div>
                  </div>
                  {a.website && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Globe className="h-3 w-3" />{a.website}</p>}
                  {a.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Phone className="h-3 w-3" />{a.phone}</p>}
                  {a.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{a.address}</p>}
                  <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No accounts found</p>
          </div>
        )}
      </div>

      {currentSelected && (
        <div className="w-96 border-l bg-card flex-shrink-0 ml-4">
          <EntityDetailPanel entityType="account" entityId={currentSelected.id} entityName={currentSelected.name} onClose={() => setSelectedAccount(null)}>
            <div className="space-y-1 text-sm">
              {currentSelected.industry && <p className="text-muted-foreground">{currentSelected.industry}</p>}
              {currentSelected.website && <p className="text-muted-foreground"><Globe className="h-3 w-3 inline mr-1" />{currentSelected.website}</p>}
              {currentSelected.phone && <p className="text-muted-foreground"><Phone className="h-3 w-3 inline mr-1" />{currentSelected.phone}</p>}
            </div>
          </EntityDetailPanel>
        </div>
      )}

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Account')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Account')}
      <ConfirmDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }} title="Delete Account" description="This will unlink all contacts. Continue?" onConfirm={() => { if (deleteId) { deleteAccount(deleteId); setDeleteId(null); } }} />
    </div>
  );
}
