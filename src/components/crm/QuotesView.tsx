import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileText, Send, Check, X, ChevronDown, ChevronUp, Download, Eye } from 'lucide-react';
import { generateQuotePdf } from '@/lib/generatePdf';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { format } from 'date-fns';
import type { QuoteStatus, QuoteLineItem, Quote } from '@/types/phase5';
import { useQuotes } from '@/hooks/useQuotes';
import { useDeals } from '@/hooks/useDeals';
import { useProducts } from '@/hooks/useProducts';
import { useInvoices } from '@/hooks/useInvoices';

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function QuotesView() {
  const { quotes, addQuote, updateQuote, updateQuoteStatus, deleteQuote } = useQuotes();
  const { deals } = useDeals();
  const { products } = useProducts();
  const { generateFromQuote } = useInvoices();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [dealId, setDealId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<Omit<QuoteLineItem, 'id' | 'quoteId'>[]>([]);

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0, total: 0 }]);
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    if (field === 'productId' && value) {
      const p = products.find(pr => pr.id === value);
      if (p) { updated[idx].productName = p.name; updated[idx].unitPrice = p.price; updated[idx].description = p.description; }
    }
    updated[idx].total = updated[idx].quantity * updated[idx].unitPrice - updated[idx].discount + updated[idx].tax;
    setLineItems(updated);
  };

  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const handleAdd = () => {
    const deal = deals.find(d => d.id === dealId);
    addQuote({ dealId: dealId || undefined, dealName: deal?.name || '', accountName: deal?.accountName || '', contactName: deal?.contactName || '', status: 'draft' as QuoteStatus, validUntil, notes, lineItems });
    setDealId(''); setValidUntil(''); setNotes(''); setLineItems([]); setDialogOpen(false);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Quotes</h1>
          <p className="text-muted-foreground mt-1">Create and manage quotes linked to deals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Quote</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Quote</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deal (optional)</Label>
                  <Select value={dealId} onValueChange={setDealId}>
                    <SelectTrigger><SelectValue placeholder="Select deal" /></SelectTrigger>
                    <SelectContent>{deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Valid Until</Label><Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button variant="outline" size="sm" onClick={addLineItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                </div>
                {lineItems.map((li, idx) => (
                  <Card key={idx}>
                    <CardContent className="py-3 space-y-2">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Select value={li.productId || ''} onValueChange={v => updateLineItem(idx, 'productId', v)}>
                          <SelectTrigger><SelectValue placeholder="Select product or type custom" /></SelectTrigger>
                          <SelectContent>{products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                      {!li.productId && <Input placeholder="Product name" value={li.productName} onChange={e => updateLineItem(idx, 'productName', e.target.value)} />}
                      <div className="grid grid-cols-4 gap-2">
                        <div><Label className="text-xs">Qty</Label><Input type="number" min={1} value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))} /></div>
                        <div><Label className="text-xs">Unit Price</Label><Input type="number" step="0.01" value={li.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', Number(e.target.value))} /></div>
                        <div><Label className="text-xs">Discount</Label><Input type="number" step="0.01" value={li.discount} onChange={e => updateLineItem(idx, 'discount', Number(e.target.value))} /></div>
                        <div><Label className="text-xs">Tax</Label><Input type="number" step="0.01" value={li.tax} onChange={e => updateLineItem(idx, 'tax', Number(e.target.value))} /></div>
                      </div>
                      <div className="text-right text-sm font-medium text-foreground">Line Total: {formatCurrency(li.quantity * li.unitPrice - li.discount + li.tax)}</div>
                    </CardContent>
                  </Card>
                ))}
                {lineItems.length > 0 && <div className="text-right font-bold text-foreground">Grand Total: {formatCurrency(lineItems.reduce((s, li) => s + li.quantity * li.unitPrice - li.discount + li.tax, 0))}</div>}
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={lineItems.length === 0}>Create Quote</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {quotes.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium text-foreground">No quotes yet</h3><p className="text-muted-foreground mt-1">Create a quote to get started</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <Card key={q.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{q.quoteNumber}</h3>
                      <Badge className={STATUS_COLORS[q.status]}>{q.status}</Badge>
                      {q.dealName && <span className="text-sm text-muted-foreground">• {q.dealName}</span>}
                      {expandedId === q.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Total: {formatCurrency(q.grandTotal)}</span>
                      {q.validUntil && <span>Valid until: {format(new Date(q.validUntil), 'MMM d, yyyy')}</span>}
                      <span>{q.lineItems.length} items</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {q.status === 'draft' && <Button variant="ghost" size="sm" onClick={() => updateQuoteStatus(q.id, 'sent')} title="Mark as sent"><Send className="h-4 w-4" /></Button>}
                    {q.status === 'sent' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => updateQuoteStatus(q.id, 'accepted')} title="Accept"><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => updateQuoteStatus(q.id, 'rejected')} title="Reject"><X className="h-4 w-4 text-red-600" /></Button>
                      </>
                    )}
                    {q.status === 'accepted' && <Button variant="outline" size="sm" onClick={() => generateFromQuote(q)}>Generate Invoice</Button>}
                    <Button variant="ghost" size="icon" onClick={() => setPreviewQuote(q)} title="Preview"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generateQuotePdf(q)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuote(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                {expandedId === q.id && q.lineItems.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground"><th className="text-left pb-2">Product</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Price</th><th className="text-right pb-2">Discount</th><th className="text-right pb-2">Tax</th><th className="text-right pb-2">Total</th></tr></thead>
                      <tbody>{q.lineItems.map(li => (
                        <tr key={li.id} className="border-t border-border"><td className="py-1 text-foreground">{li.productName}</td><td className="py-1 text-right">{li.quantity}</td><td className="py-1 text-right">{formatCurrency(li.unitPrice)}</td><td className="py-1 text-right">{formatCurrency(li.discount)}</td><td className="py-1 text-right">{formatCurrency(li.tax)}</td><td className="py-1 text-right font-medium">{formatCurrency(li.total)}</td></tr>
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
        open={!!previewQuote}
        onOpenChange={(open) => { if (!open) setPreviewQuote(null); }}
        document={previewQuote}
        type="quote"
        onSave={async (id, updates) => { await updateQuote(id, updates); setPreviewQuote(null); }}
      />
    </div>
  );
}
