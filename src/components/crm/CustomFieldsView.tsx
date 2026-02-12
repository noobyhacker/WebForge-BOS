import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2, GripVertical } from 'lucide-react';
import type { CustomFieldDefinition, CustomFieldType, CustomFieldEntityType } from '@/types/phase6';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
};

const ENTITY_TYPE_LABELS: Record<CustomFieldEntityType, string> = {
  client: 'Client',
  contact: 'Contact',
  account: 'Account',
  deal: 'Deal',
};

interface Props {
  fields: CustomFieldDefinition[];
  onAdd: (field: Omit<CustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<CustomFieldDefinition>) => void;
  onDelete: (id: string) => void;
}

export function CustomFieldsView({ fields, onAdd, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [entityType, setEntityType] = useState<CustomFieldEntityType>('client');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const resetForm = () => {
    setName('');
    setLabel('');
    setFieldType('text');
    setEntityType('client');
    setIsRequired(false);
    setOptions('');
  };

  const handleAdd = () => {
    if (!name.trim() || !label.trim()) return;
    onAdd({
      name: name.trim().toLowerCase().replace(/\s+/g, '_'),
      label: label.trim(),
      fieldType,
      entityType,
      options: fieldType === 'dropdown' ? options.split(',').map(o => o.trim()).filter(Boolean) : [],
      isRequired,
      sortOrder: fields.filter(f => f.entityType === entityType).length,
    });
    resetForm();
    setDialogOpen(false);
  };

  const filtered = filterEntity === 'all' ? fields : fields.filter(f => f.entityType === filterEntity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Custom Fields
          </h1>
          <p className="text-muted-foreground mt-1">Define custom fields for any entity type</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Field</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Field</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Field Label</Label>
                  <Input value={label} onChange={e => { setLabel(e.target.value); if (!name) setName(e.target.value.toLowerCase().replace(/\s+/g, '_')); }} placeholder="e.g. Company Size" />
                </div>
                <div>
                  <Label>Field Name (key)</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. company_size" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={v => setEntityType(v as CustomFieldEntityType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Field Type</Label>
                  <Select value={fieldType} onValueChange={v => setFieldType(v as CustomFieldType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {fieldType === 'dropdown' && (
                <div>
                  <Label>Options (comma-separated)</Label>
                  <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="Small, Medium, Large, Enterprise" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                <Label>Required field</Label>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!name.trim() || !label.trim()}>
                Create Field
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Filter:</Label>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} fields</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No custom fields</h3>
            <p className="text-muted-foreground mt-1">Create fields to extend entity data</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(field => (
            <Card key={field.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{field.label}</span>
                      <Badge variant="outline">{ENTITY_TYPE_LABELS[field.entityType]}</Badge>
                      <Badge variant="secondary">{FIELD_TYPE_LABELS[field.fieldType]}</Badge>
                      {field.isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Key: {field.name}
                      {field.fieldType === 'dropdown' && field.options.length > 0 && (
                        <span> • Options: {field.options.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDelete(field.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
