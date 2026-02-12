import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Zap, Play, Pause } from 'lucide-react';
import type { AutomationRule, AutomationTrigger, AutomationAction, AutomationEntityType } from '@/types/phase4';

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  record_created: 'Record Created',
  field_updated: 'Field Updated',
  stage_changed: 'Stage Changed',
  score_threshold: 'Score Threshold Reached',
};

const ACTION_LABELS: Record<AutomationAction, string> = {
  update_field: 'Update Field',
  assign_owner: 'Assign Owner',
  create_task: 'Create Task',
  change_stage: 'Change Deal Stage',
  send_notification: 'Send Notification',
};

const ENTITY_LABELS: Record<AutomationEntityType, string> = {
  client: 'Client',
  contact: 'Contact',
  deal: 'Deal',
  account: 'Account',
};

interface Props {
  rules: AutomationRule[];
  onAdd: (rule: Omit<AutomationRule, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<AutomationRule>) => void;
  onDelete: (id: string) => void;
}

export function AutomationRulesView({ rules, onAdd, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<AutomationEntityType>('deal');
  const [trigger, setTrigger] = useState<AutomationTrigger>('stage_changed');
  const [triggerField, setTriggerField] = useState('');
  const [triggerValue, setTriggerValue] = useState('');
  const [action, setAction] = useState<AutomationAction>('create_task');
  const [actionField, setActionField] = useState('');
  const [actionValue, setActionValue] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setEntityType('deal');
    setTrigger('stage_changed');
    setTriggerField('');
    setTriggerValue('');
    setAction('create_task');
    setActionField('');
    setActionValue('');
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name,
      description,
      entityType,
      trigger,
      triggerConfig: { field: triggerField, value: triggerValue },
      action,
      actionConfig: { field: actionField, value: actionValue },
      isActive: true,
    });
    resetForm();
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Automation Rules
          </h1>
          <p className="text-muted-foreground mt-1">Configure rules that trigger actions automatically</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto-create task on new deal" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this rule do?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={(v) => setEntityType(v as AutomationEntityType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Trigger</Label>
                  <Select value={trigger} onValueChange={(v) => setTrigger(v as AutomationTrigger)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(trigger === 'field_updated' || trigger === 'stage_changed') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Trigger Field</Label>
                    <Input value={triggerField} onChange={e => setTriggerField(e.target.value)} placeholder="e.g. stage, status" />
                  </div>
                  <div>
                    <Label>Trigger Value</Label>
                    <Input value={triggerValue} onChange={e => setTriggerValue(e.target.value)} placeholder="e.g. closed_won" />
                  </div>
                </div>
              )}
              {trigger === 'score_threshold' && (
                <div>
                  <Label>Score Threshold</Label>
                  <Input type="number" value={triggerValue} onChange={e => setTriggerValue(e.target.value)} placeholder="e.g. 50" />
                </div>
              )}
              <div>
                <Label>Action</Label>
                <Select value={action} onValueChange={(v) => setAction(v as AutomationAction)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Action Field / Subject</Label>
                  <Input value={actionField} onChange={e => setActionField(e.target.value)} placeholder="e.g. Follow up with client" />
                </div>
                <div>
                  <Label>Action Value / Details</Label>
                  <Input value={actionValue} onChange={e => setActionValue(e.target.value)} placeholder="e.g. active, proposal" />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!name.trim()}>
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No automation rules yet</h3>
            <p className="text-muted-foreground mt-1">Create rules to automate repetitive CRM tasks</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{rule.name}</h3>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{ENTITY_LABELS[rule.entityType]}</Badge>
                    </div>
                    {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">When:</span> {TRIGGER_LABELS[rule.trigger]}
                        {rule.triggerConfig?.field && ` (${rule.triggerConfig.field} = ${rule.triggerConfig.value})`}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Then:</span> {ACTION_LABELS[rule.action]}
                        {rule.actionConfig?.field && ` → ${rule.actionConfig.field}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUpdate(rule.id, { isActive: !rule.isActive })}
                      title={rule.isActive ? 'Pause' : 'Activate'}
                    >
                      {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
