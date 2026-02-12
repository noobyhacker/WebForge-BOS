import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { generateQuotePdf, generateInvoicePdf } from '@/lib/generatePdf';
import { format } from 'date-fns';
import type { Quote, Invoice, QuoteLineItem } from '@/types/phase5';
import logoImg from '@/assets/webforge-logo.png';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

type DocumentType = 'quote' | 'invoice';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Quote | Invoice | null;
  type: DocumentType;
  onSave: (id: string, updates: any) => Promise<void>;
}

export function DocumentPreviewDialog({ open, onOpenChange, document: doc, type, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [dealName, setDealName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<Omit<QuoteLineItem, 'id' | 'quoteId'>[]>([]);

  useEffect(() => {
    if (doc) {
      setDealName(doc.dealName || '');
      setAccountName(doc.accountName || '');
      setContactName(doc.contactName || '');
      setNotes(doc.notes || '');
      setLineItems(doc.lineItems.map(li => ({
        productId: li.productId, productName: li.productName, description: li.description,
        quantity: li.quantity, unitPrice: li.unitPrice, discount: li.discount, tax: li.tax, total: li.total,
      })));
      if (type === 'quote') {
        setValidUntil((doc as Quote).validUntil || '');
      } else {
        setIssueDate((doc as Invoice).issueDate || '');
        setDueDate((doc as Invoice).dueDate || '');
      }
      setEditing(false);
    }
  }, [doc, type]);

  if (!doc) return null;

  const isQuote = type === 'quote';
  const quote = isQuote ? (doc as Quote) : null;
  const invoice = !isQuote ? (doc as Invoice) : null;
  const docNumber = isQuote ? quote!.quoteNumber : invoice!.invoiceNumber;
  const docTitle = isQuote ? 'QUOTE' : 'INVOICE';

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const totalDiscount = lineItems.reduce((s, li) => s + li.discount, 0);
  const totalTax = lineItems.reduce((s, li) => s + li.tax, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  const updateLineItem = (idx: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    updated[idx].total = updated[idx].quantity * updated[idx].unitPrice - updated[idx].discount + updated[idx].tax;
    setLineItems(updated);
  };

  const handleSave = async () => {
    const updates: any = { dealName, accountName, contactName, notes, lineItems };
    if (isQuote) updates.validUntil = validUntil;
    else { updates.issueDate = issueDate; updates.dueDate = dueDate; }
    await onSave(doc.id, updates);
    setEditing(false);
  };

  const handleDownload = () => {
    if (isQuote) {
      const updated = { ...doc, dealName, accountName, contactName, notes, validUntil, lineItems: lineItems.map((li, i) => ({ ...li, id: `li-${i}`, quoteId: doc.id })), subtotal, totalDiscount, totalTax, grandTotal } as Quote;
      generateQuotePdf(updated);
    } else {
      const updated = { ...doc, dealName, accountName, contactName, notes, issueDate, dueDate, lineItems: lineItems.map((li, i) => ({ ...li, id: `li-${i}`, quoteId: doc.id })), subtotal, totalTax, grandTotal } as Invoice;
      generateInvoicePdf(updated);
    }
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg">Preview {docTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); /* reset */ if (doc) { setDealName(doc.dealName || ''); setAccountName(doc.accountName || ''); setContactName(doc.contactName || ''); setNotes(doc.notes || ''); setLineItems(doc.lineItems.map(li => ({ productId: li.productId, productName: li.productName, description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, discount: li.discount, tax: li.tax, total: li.total }))); } }}>
                  <X className="h-4 w-4 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" />Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />PDF
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="mx-6 mb-6 border border-border rounded-lg bg-card shadow-sm">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WebForge" className="h-10 w-10 object-contain" />
                <span className="text-xl font-bold text-primary">WebForge</span>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-foreground tracking-wide">{docTitle}</h2>
                <p className="text-muted-foreground font-mono">{docNumber}</p>
                <Badge className={`mt-1 ${statusColor[doc.status] || ''}`}>{doc.status.toUpperCase()}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info Section */}
          <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs">Deal</Label>
              {editing ? <Input value={dealName} onChange={e => setDealName(e.target.value)} className="h-8 mt-1" /> : <p className="text-foreground font-medium">{dealName || '—'}</p>}
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Account</Label>
              {editing ? <Input value={accountName} onChange={e => setAccountName(e.target.value)} className="h-8 mt-1" /> : <p className="text-foreground font-medium">{accountName || '—'}</p>}
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Contact</Label>
              {editing ? <Input value={contactName} onChange={e => setContactName(e.target.value)} className="h-8 mt-1" /> : <p className="text-foreground font-medium">{contactName || '—'}</p>}
            </div>
            {isQuote && (
              <div>
                <Label className="text-muted-foreground text-xs">Valid Until</Label>
                {editing ? <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-8 mt-1" /> : <p className="text-foreground font-medium">{validUntil ? format(new Date(validUntil), 'MMM d, yyyy') : '—'}</p>}
              </div>
            )}
            {!isQuote && (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs">Issue Date</Label>
                  {editing ? <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-8 mt-1" /> : <p className="text-foreground font-medium">{issueDate ? format(new Date(issueDate), 'MMM d, yyyy') : '—'}</p>}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Due Date</Label>
                  {editing ? <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 mt-1" /> : <p className="text-foreground font-medium">{dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : '—'}</p>}
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Line Items */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">Line Items</h3>
              {editing && (
                <Button variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0, total: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">Product</th>
                    <th className="text-left pb-2 font-medium">Description</th>
                    <th className="text-right pb-2 font-medium">Qty</th>
                    <th className="text-right pb-2 font-medium">Price</th>
                    <th className="text-right pb-2 font-medium">Discount</th>
                    <th className="text-right pb-2 font-medium">Tax</th>
                    <th className="text-right pb-2 font-medium">Total</th>
                    {editing && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 pr-2">
                        {editing ? <Input value={li.productName} onChange={e => updateLineItem(idx, 'productName', e.target.value)} className="h-7 text-xs" /> : <span className="text-foreground">{li.productName}</span>}
                      </td>
                      <td className="py-2 pr-2">
                        {editing ? <Input value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-7 text-xs" /> : <span className="text-muted-foreground">{li.description || '—'}</span>}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {editing ? <Input type="number" min={1} value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))} className="h-7 text-xs w-16 ml-auto" /> : li.quantity}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {editing ? <Input type="number" step="0.01" value={li.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', Number(e.target.value))} className="h-7 text-xs w-24 ml-auto" /> : formatCurrency(li.unitPrice)}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {editing ? <Input type="number" step="0.01" value={li.discount} onChange={e => updateLineItem(idx, 'discount', Number(e.target.value))} className="h-7 text-xs w-20 ml-auto" /> : formatCurrency(li.discount)}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {editing ? <Input type="number" step="0.01" value={li.tax} onChange={e => updateLineItem(idx, 'tax', Number(e.target.value))} className="h-7 text-xs w-20 ml-auto" /> : formatCurrency(li.tax)}
                      </td>
                      <td className="py-2 text-right font-medium text-foreground">
                        {formatCurrency(li.quantity * li.unitPrice - li.discount + li.tax)}
                      </td>
                      {editing && (
                        <td className="py-2 pl-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="p-6 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span className="text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span><span className="text-foreground">{formatCurrency(totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span><span className="text-foreground">{formatCurrency(totalTax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span className="text-foreground">Grand Total</span>
                <span className="text-primary">{formatCurrency(grandTotal)}</span>
              </div>
              {!isQuote && invoice && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid</span><span className="text-green-600">{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance Due</span>
                    <span className={grandTotal - invoice.paidAmount > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatCurrency(grandTotal - invoice.paidAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {(notes || editing) && (
            <>
              <Separator />
              <div className="p-6">
                <Label className="text-muted-foreground text-xs">Notes</Label>
                {editing ? (
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" placeholder="Additional notes..." />
                ) : (
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{notes || '—'}</p>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="px-6 py-3 bg-muted/30 rounded-b-lg">
            <p className="text-xs text-muted-foreground text-center">
              Generated on {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
