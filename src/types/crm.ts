export type FollowUpStatus = 'pending' | 'completed' | 'overdue' | 'scheduled';

export interface FollowUp {
  id: string;
  clientId: string;
  date: string;
  notes: string;
  status: FollowUpStatus;
  type: 'call' | 'email' | 'meeting' | 'task';
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive' | 'lead';
  createdAt: string;
  lastContact: string;
  notes: string;
  language: string;
  followUps: FollowUp[];
  userId?: string;
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  totalContacts: number;
  totalAccounts: number;
  totalDeals: number;
  totalPipelineValue: number;
}

export type ActionType = 'create' | 'update' | 'delete';
export type EntityType = 'client' | 'follow_up' | 'contact' | 'account' | 'deal' | 'activity' | 'product';

export interface ActionLog {
  id: string;
  userEmail: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName: string;
  details?: string;
  entityData?: string;
  createdAt: string;
}

export type PermissionLevel = 'view' | 'edit';

export interface ClientShare {
  id: string;
  clientId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  permission: PermissionLevel;
  createdAt: string;
}

// ── New CRM Entities ──

export type ContactStatus = 'active' | 'inactive' | 'prospect';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountId?: string;
  accountName?: string;
  ownerId: string;
  status: ContactStatus;
  source: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  name: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  ownerId: string;
  stage: DealStage;
  value: number;
  probability: number;
  expectedCloseDate: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'task';
export type ActivityStatus = 'pending' | 'completed' | 'cancelled';

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  ownerId: string;
  dueDate: string;
  completedAt?: string;
  status: ActivityStatus;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
