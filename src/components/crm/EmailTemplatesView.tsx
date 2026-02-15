import { useState } from 'react';
import { EmailTemplate } from '@/types/phase3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { Plus, Pencil, Trash2, Mail, Search, PackagePlus } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { toast } from 'sonner';

const PRESET_TEMPLATES = [
  {
    name: 'Welcome / Onboarding',
    subject: 'Welcome to {{company}}, {{name}}!',
    body: 'Hi {{name}},\n\nWelcome aboard! We\'re thrilled to have you as a new client.\n\nHere\'s what happens next:\n1. Your dedicated account manager will reach out within 24 hours\n2. We\'ll schedule a kickoff call to align on goals\n3. You\'ll receive access to our client portal\n\nIf you have any questions in the meantime, don\'t hesitate to reply to this email.\n\nBest regards,\n{{company}}',
  },
  {
    name: 'Follow-Up After Meeting',
    subject: 'Great connecting today, {{name}}!',
    body: 'Hi {{name}},\n\nThank you for taking the time to meet with us today. It was great learning more about your goals.\n\nAs discussed, here\'s a quick recap:\n• [Key point 1]\n• [Key point 2]\n• Next steps: [action items]\n\nI\'ll follow up by [date] with the proposal. Please let me know if anything changes.\n\nBest,\n{{company}}',
  },
  {
    name: 'Proposal / Quote Sent',
    subject: 'Your proposal is ready — {{company}}',
    body: 'Hi {{name}},\n\nPlease find attached our proposal based on our recent conversation.\n\nHighlights:\n• Scope: [brief description]\n• Timeline: [estimated duration]\n• Investment: [price range]\n\nThis proposal is valid for 30 days. I\'d love to schedule a call to walk through any questions.\n\nLooking forward to your feedback!\n\nBest regards,\n{{company}}',
  },
  {
    name: 'Deal Won — Thank You',
    subject: 'We\'re excited to get started, {{name}}!',
    body: 'Hi {{name}},\n\nThank you for choosing {{company}}! We\'re excited to partner with you.\n\nYour project kick-off details:\n• Start date: [date]\n• Primary contact: [name]\n• Onboarding doc: [link]\n\nWelcome to the team!\n\nBest,\n{{company}}',
  },
  {
    name: 'Re-Engagement / Win-Back',
    subject: 'We miss you, {{name}} — let\'s reconnect',
    body: 'Hi {{name}},\n\nIt\'s been a while since we last connected, and I wanted to check in.\n\nSince we last spoke, we\'ve made some exciting updates:\n• [New feature or service]\n• [Improvement or case study]\n\nWould you be open to a quick 15-minute call to explore how we can help?\n\nLooking forward to hearing from you.\n\nBest,\n{{company}}',
  },
];

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

  const handleLoadPresets = async () => {
    try {
      for (const preset of PRESET_TEMPLATES) {
        await addTemplate(preset);
      }
      toast.success(`Loaded ${PRESET_TEMPLATES.length} preset templates`);
    } catch { toast.error('Failed to load presets'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">Reusable email templates for communication.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadPresets} className="gap-2"><PackagePlus className="h-4 w-4" />Load Presets</Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>
        </div>
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
