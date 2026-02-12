import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Lock, Eye, Edit } from 'lucide-react';
import type { FieldPermission } from '@/types/phase7';

const ENTITY_TYPES = ['client', 'contact', 'account', 'deal'];
const ENTITY_FIELDS: Record<string, string[]> = {
  client: ['name', 'email', 'phone', 'company', 'status', 'notes'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'title', 'source', 'status'],
  account: ['name', 'industry', 'website', 'phone', 'address'],
  deal: ['name', 'stage', 'value', 'probability', 'expectedCloseDate'],
};

interface Props {
  permissions: FieldPermission[];
  onAdd: (perm: Omit<FieldPermission, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<FieldPermission>) => void;
  onDelete: (id: string) => void;
}

export function FieldPermissionsView({ permissions, onAdd, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState('client');
  const [fieldName, setFieldName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const handleAdd = () => {
    if (!fieldName) return;
    onAdd({ entityType, fieldName, role, canView, canEdit });
    setFieldName('');
    setCanView(true);
    setCanEdit(true);
    setDialogOpen(false);
  };

  const filtered = filterEntity === 'all' ? permissions : permissions.filter(p => p.entityType === filterEntity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            Field Permissions
          </h1>
          <p className="text-muted-foreground mt-1">Control which roles can view or edit specific fields</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Permission</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Field Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={v => { setEntityType(v); setFieldName(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Field</Label>
                  <Select value={fieldName} onValueChange={setFieldName}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {(ENTITY_FIELDS[entityType] || []).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={v => setRole(v as 'admin' | 'user')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={canView} onCheckedChange={setCanView} />
                  <Label className="flex items-center gap-1"><Eye className="h-4 w-4" /> Can View</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={canEdit} onCheckedChange={setCanEdit} />
                  <Label className="flex items-center gap-1"><Edit className="h-4 w-4" /> Can Edit</Label>
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!fieldName}>Create Permission</Button>
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
            {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} rules</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No field permissions</h3>
            <p className="text-muted-foreground mt-1">By default, all fields are visible and editable. Add restrictions here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(perm => (
            <Card key={perm.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{perm.entityType}</Badge>
                      <span className="font-medium text-foreground">{perm.fieldName}</span>
                      <Badge variant={perm.role === 'admin' ? 'default' : 'secondary'}>{perm.role}</Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View: {perm.canView ? '✓' : '✗'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Edit className="h-3 w-3" /> Edit: {perm.canEdit ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={perm.canView}
                    onCheckedChange={v => onUpdate(perm.id, { canView: v })}
                  />
                  <Switch
                    checked={perm.canEdit}
                    onCheckedChange={v => onUpdate(perm.id, { canEdit: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => onDelete(perm.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
