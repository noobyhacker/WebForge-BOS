import { useState } from 'react';
import { Product } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, Trash2, Pencil, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from './ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';

export function ProductsView() {
  const { isAdmin } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, sku: '', isActive: true });

  const filtered = products.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()));
  const resetForm = () => setForm({ name: '', description: '', price: 0, sku: '', isActive: true });

  const handleAdd = async () => { await addProduct(form); setShowAdd(false); resetForm(); };
  const handleEdit = (p: Product) => { setForm({ name: p.name, description: p.description, price: p.price, sku: p.sku, isActive: p.isActive }); setEditId(p.id); };
  const handleUpdate = () => { if (editId) { updateProduct(editId, form); setEditId(null); resetForm(); } };

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Product Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price ($)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.name.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Product and service catalog.</p>
        </div>
        {isAdmin && <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                    </div>
                  </div>
                  <Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>}
                <p className="text-lg font-bold text-primary flex items-center gap-1"><DollarSign className="h-4 w-4" />{p.price.toLocaleString()}</p>
                {isAdmin && (
                  <div className="flex gap-1 mt-3">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No products found</p>
        </div>
      )}

      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Product')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Product')}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => { if (!o) setDeleteId(null); }}
        title="Delete Product"
        description="Are you sure you want to delete this product?"
        onConfirm={() => { if (deleteId) { deleteProduct(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
