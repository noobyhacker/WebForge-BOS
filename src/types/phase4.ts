// ── Phase 4: Automation Engine types ──

export type AutomationTrigger = 'record_created' | 'field_updated' | 'stage_changed' | 'score_threshold';
export type AutomationAction = 'update_field' | 'assign_owner' | 'create_task' | 'change_stage' | 'send_notification';
export type AutomationEntityType = 'client' | 'contact' | 'deal' | 'account';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  entityType: AutomationEntityType;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, any>;
  action: AutomationAction;
  actionConfig: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScoringRule {
  id: string;
  name: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: string;
  points: number;
  entityType: 'client' | 'contact';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScore {
  entityId: string;
  entityType: string;
  score: number;
  breakdown: { ruleName: string; points: number }[];
}
