import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Trash2, DollarSign, ChevronDown, ChevronUp, Download, Eye, UserCircle } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/generatePdf';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { format } from 'date-fns';
import { useState } from 'react';
import type { InvoiceStatus, Invoice } from '@/types/phase5';
import { useInvoices } from '@/hooks/useInvoices';
import { useProfilesMap } from '@/hooks/useProfilesMap';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function InvoicesView() {
  const { invoices, updateInvoice, updateInvoiceStatus, markPaid, deleteInvoice } = useInvoices();
  const { getOwnerName } = useProfilesMap();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" />Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage invoices generated from accepted quotes</p>
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium text-foreground">No invoices yet</h3><p className="text-muted-foreground mt-1">Generate invoices from accepted quotes</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <Card key={inv.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{inv.invoiceNumber}</h3>
                      <Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                      {inv.accountName && <span className="text-sm text-muted-foreground">• {inv.accountName}</span>}
                      {expandedId === inv.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Total: {formatCurrency(inv.grandTotal)}</span>
                      <span>Paid: {formatCurrency(inv.paidAmount)}</span>
                      <span>Due: {format(new Date(inv.dueDate), 'MMM d, yyyy')}</span>
                      <span className="flex items-center gap-1"><UserCircle className="h-3 w-3" />{getOwnerName(inv.ownerId)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {inv.status === 'draft' && <Button variant="outline" size="sm" onClick={() => updateInvoiceStatus(inv.id, 'sent')}>Send</Button>}
                    {(inv.status === 'sent' || inv.status === 'overdue') && (
                      <Button variant="outline" size="sm" onClick={() => markPaid(inv.id, inv.grandTotal)}><DollarSign className="h-4 w-4 mr-1" />Mark Paid</Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setPreviewInvoice(inv)} title="Preview"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generateInvoicePdf(inv)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteInvoice(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                {expandedId === inv.id && inv.lineItems.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground"><th className="text-left pb-2">Product</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Price</th><th className="text-right pb-2">Total</th></tr></thead>
                      <tbody>{inv.lineItems.map(li => (
                        <tr key={li.id} className="border-t border-border"><td className="py-1 text-foreground">{li.productName}</td><td className="py-1 text-right">{li.quantity}</td><td className="py-1 text-right">{formatCurrency(li.unitPrice)}</td><td className="py-1 text-right font-medium">{formatCurrency(li.total)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentPreviewDialog
        open={!!previewInvoice}
        onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
        document={previewInvoice}
        type="invoice"
        onSave={async (id, updates) => { await updateInvoice(id, updates); setPreviewInvoice(null); }}
      />
    </div>
  );
}
