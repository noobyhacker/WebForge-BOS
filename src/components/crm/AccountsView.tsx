import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Account } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Building2, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { EntityDetailPanel } from './EntityDetailPanel';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfilesMap } from '@/hooks/useProfilesMap';
import { cn } from '@/lib/utils';

export function AccountsView() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { getOwnerName, getOwnerRole } = useProfilesMap();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: '', industry: '', website: '', phone: '', address: '' });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId && accounts.length > 0) {
      const a = accounts.find(x => x.id === selectedId);
      if (a) {
        setSelectedAccount(a);
        searchParams.delete('selected');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, accounts]);

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground text-sm">Companies and organizations you work with.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Account</Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {filtered.length > 0 ? (
          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow
                    key={a.id}
                    className={cn('cursor-pointer', currentSelected?.id === a.id && 'bg-primary/5')}
                    onClick={() => setSelectedAccount(a)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="truncate">{a.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.industry || '—'}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[150px]">{a.website || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{a.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[150px]">{a.address || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{getOwnerName(a.ownerId)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No accounts found</p>
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
          <EntityDetailPanel entityType="account" entityId={currentSelected.id} entityName={currentSelected.name} onClose={() => setSelectedAccount(null)}>
            <div className="space-y-1 text-sm">
              {currentSelected.industry && <p className="text-muted-foreground">{currentSelected.industry}</p>}
              {currentSelected.website && <p className="text-muted-foreground">🌐 {currentSelected.website}</p>}
              {currentSelected.phone && <p className="text-muted-foreground">☎ {currentSelected.phone}</p>}
            </div>
          </EntityDetailPanel>
        )}
      </div>

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Account')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Account')}
      <ConfirmDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }} title="Delete Account" description="This will unlink all contacts. Continue?" onConfirm={() => { if (deleteId) { deleteAccount(deleteId); setDeleteId(null); } }} />
    </div>
  );
}
