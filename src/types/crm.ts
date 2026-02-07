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
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
}
