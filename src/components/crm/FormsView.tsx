import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Copy, Eye, Trash2, ArrowUp, ArrowDown, Code2, BarChart3, CheckCircle2, Webhook, Key, RefreshCw } from 'lucide-react';
import { useForms, FormField } from '@/hooks/useForms';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Entity → field mapping options
const ENTITY_FIELD_OPTIONS: Record<string, { label: string; fields: { value: string; label: string }[] }> = {
  client: {
    label: 'Client (Lead)',
    fields: [
      { value: 'name', label: 'Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'company', label: 'Company' },
      { value: 'notes', label: 'Notes' },
    ],
  },
  contact: {
    label: 'Contact',
    fields: [
      { value: 'first_name', label: 'First Name' },
      { value: 'last_name', label: 'Last Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'title', label: 'Job Title' },
      { value: 'source', label: 'Source' },
    ],
  },
  account: {
    label: 'Account',
    fields: [
      { value: 'name', label: 'Name' },
      { value: 'phone', label: 'Phone' },
      { value: 'website', label: 'Website' },
      { value: 'industry', label: 'Industry' },
      { value: 'address', label: 'Address' },
    ],
  },
};

const AVAILABLE_FIELDS = [
  { key: 'name', label: 'Full Name', type: 'text', defaultRequired: true, defaultEntity: 'client', defaultField: 'name' },
  { key: 'email', label: 'Email Address', type: 'email', defaultRequired: true, defaultEntity: 'client', defaultField: 'email' },
  { key: 'phone', label: 'Phone Number', type: 'phone', defaultRequired: false, defaultEntity: 'client', defaultField: 'phone' },
  { key: 'title', label: 'Job Title', type: 'text', defaultRequired: false, defaultEntity: 'contact', defaultField: 'title' },
  { key: 'company', label: 'Company', type: 'text', defaultRequired: false, defaultEntity: 'account', defaultField: 'name' },
  { key: 'message', label: 'Message', type: 'textarea', defaultRequired: false, defaultEntity: 'client', defaultField: 'notes' },
] as const;

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  enabled: boolean;
  required: boolean;
  sort_order: number;
  target_entity: string;
  target_field: string;
}

export function FormsView() {
  const { user, isAdmin } = useAuth();
  const { forms, isLoading, submissions, createForm, updateForm, deleteForm, saveFields } = useForms();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [activeTab, setActiveTab] = useState('forms');
  const [copied, setCopied] = useState<string | null>(null);

  // Webhook API keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ['webhook_api_keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('webhook_api_keys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  const createApiKey = useMutation({
    mutationFn: async (name: string) => {
      const key = 'bos_' + crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase.from('webhook_api_keys').insert({ name, api_key: key, created_by: user!.id });
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => {
      qc.invalidateQueries({ queryKey: ['webhook_api_keys'] });
      navigator.clipboard.writeText(key);
      toast.success('API key created and copied to clipboard. Store it securely — it won\'t be shown again.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteApiKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('webhook_api_keys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhook_api_keys'] }); toast.success('API key deleted'); },
  });

  const editingForm = forms.find(f => f.id === editingFormId);

  const openEditor = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return;
    const existingFields = form.form_fields || [];
    const configs: FieldConfig[] = AVAILABLE_FIELDS.map((af, i) => {
      const existing = existingFields.find(ef => ef.field_key === af.key);
      return {
        key: af.key,
        label: existing?.label || af.label,
        type: existing?.field_type || af.type,
        enabled: !!existing,
        required: existing?.is_required ?? af.defaultRequired,
        sort_order: existing?.sort_order ?? i,
        target_entity: existing?.target_entity || af.defaultEntity,
        target_field: existing?.target_field || af.defaultField,
      };
    });
    configs.sort((a, b) => a.sort_order - b.sort_order);
    setFieldConfigs(configs);
    setEditingFormId(formId);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newConfigs = [...fieldConfigs];
    const target = index + direction;
    if (target < 0 || target >= newConfigs.length) return;
    [newConfigs[index], newConfigs[target]] = [newConfigs[target], newConfigs[index]];
    newConfigs.forEach((c, i) => c.sort_order = i);
    setFieldConfigs(newConfigs);
  };

  const handleSaveFields = () => {
    if (!editingFormId) return;
    const enabledFields = fieldConfigs.filter(f => f.enabled);
    saveFields.mutate({
      formId: editingFormId,
      fields: enabledFields.map(f => ({
        form_id: editingFormId,
        field_key: f.key,
        label: f.label,
        field_type: f.type,
        is_required: f.required,
        sort_order: f.sort_order,
        target_entity: f.target_entity,
        target_field: f.target_field,
      })),
    });
  };

  const handleCreateForm = () => {
    if (!newName.trim()) return;
    createForm.mutate({ name: newName.trim(), description: newDesc.trim() }, {
      onSuccess: (data) => {
        setShowCreate(false);
        setNewName('');
        setNewDesc('');
        saveFields.mutate({
          formId: data.id,
          fields: [
            { form_id: data.id, field_key: 'name', label: 'Full Name', field_type: 'text', is_required: true, sort_order: 0, target_entity: 'client', target_field: 'name' },
            { form_id: data.id, field_key: 'email', label: 'Email Address', field_type: 'email', is_required: true, sort_order: 1, target_entity: 'client', target_field: 'email' },
          ],
        });
      },
    });
  };

  const generateEmbedCode = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return '';
    const fields = (form.form_fields || []).sort((a, b) => a.sort_order - b.sort_order);
    const endpoint = `${SUPABASE_URL}/functions/v1/form-submit`;

    const fieldHtml = fields.map(f => {
      const req = f.is_required ? ' required' : '';
      const reqMark = f.is_required ? ' *' : '';
      if (f.field_type === 'textarea') {
        return `  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">${f.label}${reqMark}</label>
    <textarea name="${f.field_key}" rows="3"${req} style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;resize:vertical;"></textarea>
  </div>`;
      }
      const inputType = f.field_type === 'email' ? 'email' : f.field_type === 'phone' ? 'tel' : 'text';
      return `  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">${f.label}${reqMark}</label>
    <input name="${f.field_key}" type="${inputType}"${req} style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;" />
  </div>`;
    }).join('\n');

    return `<form action="${endpoint}" method="POST" style="max-width:480px;font-family:system-ui,sans-serif;">
  <input type="hidden" name="form_id" value="${formId}" />
  <input type="hidden" name="source" value="embed" />
  <input type="hidden" name="page_url" value="" />
  <!-- Honeypot -->
  <div style="position:absolute;left:-9999px;">
    <input name="website" tabindex="-1" autocomplete="off" />
  </div>
${fieldHtml}
  <button type="submit" style="width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;">
    Submit
  </button>
</form>`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  const submissionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of submissions) { counts[s.form_id] = (counts[s.form_id] || 0) + 1; }
    return counts;
  }, [submissions]);

  const thisMonthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    for (const s of submissions) {
      if (new Date(s.submitted_at) >= startOfMonth) { counts[s.form_id] = (counts[s.form_id] || 0) + 1; }
    }
    return counts;
  }, [submissions]);

  const previewFields = fieldConfigs.filter(f => f.enabled).sort((a, b) => a.sort_order - b.sort_order);

  // Determine which entities this form creates based on field mappings
  const targetEntities = useMemo(() => {
    const entities = new Set(previewFields.map(f => f.target_entity));
    return Array.from(entities);
  }, [previewFields]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Capture Forms</h1>
          <p className="text-muted-foreground">Create forms, generate embed codes, and manage webhook integrations.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Form
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forms" className="gap-2"><Code2 className="h-4 w-4" /> Forms</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2"><Webhook className="h-4 w-4" /> Webhooks</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>

        {/* FORMS TAB */}
        <TabsContent value="forms" className="space-y-4">
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading forms...</CardContent></Card>
          ) : forms.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Code2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No forms yet. Create your first lead capture form.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {forms.map(form => {
                const entities = new Set((form.form_fields || []).map((f: any) => f.target_entity).filter(Boolean));
                return (
                  <Card key={form.id} className="hover-lift">
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{form.name}</span>
                          <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-xs">
                            {form.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {form.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{form.description}</p>}
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{(form.form_fields || []).length} fields</span>
                          <span>{submissionCounts[form.id] || 0} submissions</span>
                          {entities.size > 0 && (
                            <span>Creates: {Array.from(entities).map(e => ENTITY_FIELD_OPTIONS[e as string]?.label || e).join(' + ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={form.is_active}
                          onCheckedChange={(checked) => updateForm.mutate({ id: form.id, is_active: checked })}
                        />
                        <Button size="sm" variant="outline" onClick={() => openEditor(form.id)}>
                          <Eye className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(generateEmbedCode(form.id), form.id)}>
                          {copied === form.id ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                          Embed
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteForm.mutate(form.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* WEBHOOKS TAB */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5" /> Webhook API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use API keys to send lead data via JSON webhook to <code className="text-xs bg-muted px-1 py-0.5 rounded">{SUPABASE_URL}/functions/v1/webhook-leads</code>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { const name = prompt('API key name:'); if (name) createApiKey.mutate(name); }} className="gap-1">
                  <Plus className="h-3 w-3" /> Generate Key
                </Button>
              </div>
              {apiKeys.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {apiKeys.map((k: any) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="font-mono text-xs">{k.api_key.slice(0, 8)}...{k.api_key.slice(-4)}</TableCell>
                        <TableCell><Badge variant={k.is_active ? 'default' : 'secondary'}>{k.is_active ? 'Active' : 'Off'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteApiKey.mutate(k.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 space-y-2">
                <Label>Webhook Payload Example</Label>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto text-foreground">
{`curl -X POST "${SUPABASE_URL}/functions/v1/webhook-leads" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "name": "John Doe",
    "email": "john@email.com",
    "phone": "+821012345678",
    "title": "Procurement Manager",
    "company": "ACME Corp",
    "message": "Looking for pricing",
    "source": "landing_page"
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="py-4 text-center"><p className="text-3xl font-bold">{submissions.length}</p><p className="text-sm text-muted-foreground">Total Submissions</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-3xl font-bold">{Object.values(thisMonthCounts).reduce((a, b) => a + b, 0)}</p><p className="text-sm text-muted-foreground">This Month</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-3xl font-bold">{forms.filter(f => f.is_active).length}</p><p className="text-sm text-muted-foreground">Active Forms</p></CardContent></Card>
          </div>
          {forms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Submissions by Form</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Form</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">This Month</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {forms.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell><Badge variant={f.is_active ? 'default' : 'secondary'} className="text-xs">{f.is_active ? 'Active' : 'Off'}</Badge></TableCell>
                        <TableCell className="text-right">{submissionCounts[f.id] || 0}</TableCell>
                        <TableCell className="text-right">{thisMonthCounts[f.id] || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE FORM DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Form</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Form Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Website Contact Form" /></div>
            <div className="space-y-2"><Label>Description (optional)</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What is this form for?" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateForm} disabled={!newName.trim()}>Create Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIELD EDITOR + PREVIEW DIALOG */}
      <Dialog open={!!editingFormId} onOpenChange={(open) => { if (!open) setEditingFormId(null); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Form: {editingForm?.name}</DialogTitle>
          </DialogHeader>

          {/* Entity creation summary */}
          {targetEntities.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">This form creates:</span>
              {targetEntities.map(e => (
                <Badge key={e} variant="outline" className="text-xs">
                  {ENTITY_FIELD_OPTIONS[e]?.label || e}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field configuration */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Fields & Data Mapping</h3>
              {fieldConfigs.map((fc, i) => (
                <div key={fc.key} className={`p-3 rounded-lg border space-y-2 ${fc.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <Switch checked={fc.enabled} onCheckedChange={(v) => {
                      const updated = [...fieldConfigs];
                      updated[i] = { ...updated[i], enabled: v };
                      setFieldConfigs(updated);
                    }} />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={fc.label}
                        onChange={e => {
                          const updated = [...fieldConfigs];
                          updated[i] = { ...updated[i], label: e.target.value };
                          setFieldConfigs(updated);
                        }}
                        className="h-8 text-sm"
                        disabled={!fc.enabled}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={fc.required}
                          onChange={e => {
                            const updated = [...fieldConfigs];
                            updated[i] = { ...updated[i], required: e.target.checked };
                            setFieldConfigs(updated);
                          }}
                          disabled={!fc.enabled}
                          className="mr-1"
                        />
                        Req
                      </label>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveField(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveField(i, 1)} disabled={i === fieldConfigs.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  {/* Mapping row */}
                  {fc.enabled && (
                    <div className="flex items-center gap-2 pl-12">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Maps to →</span>
                      <Select
                        value={fc.target_entity}
                        onValueChange={(val) => {
                          const updated = [...fieldConfigs];
                          const firstField = ENTITY_FIELD_OPTIONS[val]?.fields[0]?.value || '';
                          updated[i] = { ...updated[i], target_entity: val, target_field: firstField };
                          setFieldConfigs(updated);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ENTITY_FIELD_OPTIONS).map(([key, opt]) => (
                            <SelectItem key={key} value={key}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">.</span>
                      <Select
                        value={fc.target_field}
                        onValueChange={(val) => {
                          const updated = [...fieldConfigs];
                          updated[i] = { ...updated[i], target_field: val };
                          setFieldConfigs(updated);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(ENTITY_FIELD_OPTIONS[fc.target_entity]?.fields || []).map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={handleSaveFields} className="w-full mt-2" disabled={saveFields.isPending}>
                {saveFields.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Fields
              </Button>
            </div>

            {/* Live preview */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Preview</h3>
              <div className="border rounded-lg p-6 bg-background">
                <div style={{ maxWidth: 480, fontFamily: 'system-ui, sans-serif' }}>
                  {previewFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Enable fields to see a preview</p>
                  ) : (
                    previewFields.map(f => (
                      <div key={f.key} style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                          {f.label}{f.required ? ' *' : ''}
                        </label>
                        {f.type === 'textarea' ? (
                          <textarea rows={3} disabled className="w-full p-2 border rounded-md text-sm bg-muted/30" />
                        ) : (
                          <input type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} disabled className="w-full p-2 border rounded-md text-sm bg-muted/30" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          → {ENTITY_FIELD_OPTIONS[f.target_entity]?.label}.{ENTITY_FIELD_OPTIONS[f.target_entity]?.fields.find(x => x.value === f.target_field)?.label || f.target_field}
                        </span>
                      </div>
                    ))
                  )}
                  {previewFields.length > 0 && (
                    <button disabled className="w-full p-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium">Submit</button>
                  )}
                </div>
              </div>

              {editingFormId && previewFields.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Embed HTML</Label>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(generateEmbedCode(editingFormId), 'embed')}>
                      {copied === 'embed' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-40 text-foreground">{generateEmbedCode(editingFormId)}</pre>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
