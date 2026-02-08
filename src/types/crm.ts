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
  followUps: FollowUp[];
  userId?: string; // Owner of the client
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
}

export type ActionType = 'create' | 'update' | 'delete';
export type EntityType = 'client' | 'follow_up';

export interface ActionLog {
  id: string;
  userEmail: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName: string;
  details?: string;
  entityData?: string; // JSON string of deleted entity for undo
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
