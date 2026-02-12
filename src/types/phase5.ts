// ── Phase 5: Quotes, Invoices, Documents ──

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  productId?: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  dealId?: string;
  dealName?: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  status: QuoteStatus;
  validUntil: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  notes: string;
  ownerId: string;
  lineItems: QuoteLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId?: string;
  dealId?: string;
  dealName?: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  notes: string;
  ownerId: string;
  lineItems: QuoteLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: string;
  entityId: string;
  uploadedBy: string;
  createdAt: string;
}
