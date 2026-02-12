// ── Phase 3 types ──

export interface Note {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  authorId: string;
  authorEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
