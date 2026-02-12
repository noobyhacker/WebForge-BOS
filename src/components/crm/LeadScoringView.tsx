import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Star, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LeadScoringRule, LeadScore } from '@/types/phase4';
import type { Client } from '@/types/crm';
import type { Contact } from '@/types/crm';
import { calculateLeadScore } from '@/hooks/useLeadScoring';

const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Equals',
  contains: 'Contains',
  greater_than: 'Greater Than',
  less_than: 'Less Than',
  exists: 'Has Value',
};

const CLIENT_FIELDS = ['name', 'email', 'phone', 'company', 'status', 'notes'];
const CONTACT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'source', 'title', 'status'];

interface Props {
  rules: LeadScoringRule[];
  clients: Client[];
  contacts: Contact[];
  onAdd: (rule: Omit<LeadScoringRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<LeadScoringRule>) => void;
  onDelete: (id: string) => void;
}

export function LeadScoringView({ rules, clients, contacts, onAdd, onUpdate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<'client' | 'contact'>('client');
  const [field, setField] = useState('');
  const [operator, setOperator] = useState<'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists'>('equals');
  const [value, setValue] = useState('');
  const [points, setPoints] = useState(10);

  const fields = entityType === 'client' ? CLIENT_FIELDS : CONTACT_FIELDS;

  const scoredClients = useMemo(() => {
    return clients
      .filter(c => c.status === 'lead')
      .map(c => ({ entity: c, ...calculateLeadScore(c, 'client', rules) }))
      .sort((a, b) => b.score - a.score);
  }, [clients, rules]);

  const scoredContacts = useMemo(() => {
    return contacts
      .filter(c => c.status === 'prospect')
      .map(c => ({ entity: c, ...calculateLeadScore(c, 'contact', rules) }))
      .sort((a, b) => b.score - a.score);
  }, [contacts, rules]);

  const handleAdd = () => {
    if (!name.trim() || !field) return;
    onAdd({ name, field, operator, value, points, entityType, isActive: true });
    setName('');
    setField('');
    setOperator('equals');
    setValue('');
    setPoints(10);
    setDialogOpen(false);
  };

  const scoreColor = (score: number) => {
    if (score >= 50) return 'text-green-600 dark:text-green-400';
    if (score >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Lead Scoring
          </h1>
          <p className="text-muted-foreground mt-1">Configure scoring rules and view ranked leads</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Scoring Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Has email (+10)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={(v) => { setEntityType(v as any); setField(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client (Lead)</SelectItem>
                      <SelectItem value="contact">Contact (Prospect)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Field</Label>
                  <Select value={field} onValueChange={setField}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {fields.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Operator</Label>
                  <Select value={operator} onValueChange={(v) => setOperator(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {operator !== 'exists' && (
                  <div>
                    <Label>Value</Label>
                    <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Match value" />
                  </div>
                )}
              </div>
              <div>
                <Label>Points</Label>
                <Input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} />
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!name.trim() || !field}>
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scoring Rules */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Scoring Rules</h2>
        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No scoring rules configured yet. Create rules to rank your leads.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {rules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.points > 0 ? `+${rule.points}` : rule.points}
                    </Badge>
                    <span className="font-medium text-foreground">{rule.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {rule.entityType === 'client' ? 'Client' : 'Contact'} → {rule.field} {OPERATOR_LABELS[rule.operator]}{rule.operator !== 'exists' ? ` "${rule.value}"` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(v) => onUpdate(rule.id, { isActive: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => onDelete(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Scored Leads */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Client Leads (Ranked)</h2>
          {scoredClients.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No leads to score</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {scoredClients.map(({ entity, score, breakdown }) => (
                <TooltipProvider key={entity.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-default">
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-foreground">{entity.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">{entity.company}</span>
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${scoreColor(score)}`}>
                            <Star className="h-4 w-4" />
                            {score}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      {breakdown.length > 0
                        ? breakdown.map((b, i) => <div key={i}>{b.ruleName}: +{b.points}</div>)
                        : <div>No rules matched</div>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Contact Prospects (Ranked)</h2>
          {scoredContacts.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No prospects to score</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {scoredContacts.map(({ entity, score, breakdown }) => (
                <TooltipProvider key={entity.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="cursor-default">
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-foreground">{entity.firstName} {entity.lastName}</span>
                            <span className="text-sm text-muted-foreground ml-2">{entity.title}</span>
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${scoreColor(score)}`}>
                            <Star className="h-4 w-4" />
                            {score}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      {breakdown.length > 0
                        ? breakdown.map((b, i) => <div key={i}>{b.ruleName}: +{b.points}</div>)
                        : <div>No rules matched</div>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
