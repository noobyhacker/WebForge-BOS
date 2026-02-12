// ── Phase 6: Custom Fields & Import/Export ──

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown';
export type CustomFieldEntityType = 'client' | 'contact' | 'account' | 'deal';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  fieldType: CustomFieldType;
  entityType: CustomFieldEntityType;
  options: string[]; // for dropdown type
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  entityId: string;
  value: string;
}
