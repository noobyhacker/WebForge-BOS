// ── Phase 7: Security Hardening types ──

export type ShareableEntityType = 'contact' | 'account' | 'deal';
export type PermissionLevel = 'view' | 'edit';

export interface EntityShare {
  id: string;
  entityType: ShareableEntityType;
  entityId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  permission: PermissionLevel;
  createdAt: string;
}

export interface FieldPermission {
  id: string;
  entityType: string;
  fieldName: string;
  role: 'admin' | 'user';
  canView: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SharingGroup {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
