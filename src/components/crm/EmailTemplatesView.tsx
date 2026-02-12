import { useState } from 'react';
import { EmailTemplate } from '@/types/phase3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { Plus, Pencil, Trash2, Mail, Search } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

export function EmailTemplatesView() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useEmailTemplates();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });

  const filtered = templates.filter(t => `${t.name} ${t.subject}`.toLowerCase().includes(search.toLowerCase()));
  const resetForm = () => setForm({ name: '', subject: '', body: '' });

  const handleAdd = async () => { await addTemplate(form); setShowAdd(false); resetForm(); };
  const handleEdit = (t: EmailTemplate) => { setForm({ name: t.name, subject: t.subject, body: t.body }); setEditId(t.id); };
  const handleUpdate = () => { if (editId) { updateTemplate(editId, form); setEditId(null); resetForm(); } };

  const formDialog = (open: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Template Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Follow-up after meeting" /></div>
          <div><Label>Subject Line</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Great meeting you, {{name}}!" /></div>
          <div><Label>Body</Label><Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="min-h-[200px]" placeholder="Hi {{name}},&#10;&#10;Thank you for your time..." /></div>
          <p className="text-xs text-muted-foreground">Use {'{{name}}'}, {'{{company}}'}, {'{{email}}'} as placeholders.</p>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={!form.name.trim()}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">Reusable email templates for communication.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Mail className="h-4 w-4 text-primary" /></div>
                    <p className="font-semibold text-sm">{t.name}</p>
                  </div>
                </div>
                {t.subject && <p className="text-xs font-medium text-foreground mb-1">Subject: {t.subject}</p>}
                <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
                <div className="flex gap-1 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No email templates yet</p>
        </div>
      )}
      {formDialog(showAdd, () => setShowAdd(false), handleAdd, 'Add Email Template')}
      {formDialog(!!editId, () => setEditId(null), handleUpdate, 'Edit Email Template')}
      <ConfirmDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }} title="Delete Template" description="Are you sure you want to delete this email template?" onConfirm={() => { if (deleteId) { deleteTemplate(deleteId); setDeleteId(null); } }} />
    </div>
  );
}
