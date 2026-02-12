import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, InvoiceStatus, QuoteLineItem } from '@/types/phase5';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
      return;
    }

    setInvoices(
      (data || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        quoteId: inv.quote_id,
        dealId: inv.deal_id,
        dealName: inv.deal_name || '',
        accountId: inv.account_id,
        accountName: inv.account_name || '',
        contactId: inv.contact_id,
        contactName: inv.contact_name || '',
        status: inv.status as InvoiceStatus,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        subtotal: Number(inv.subtotal) || 0,
        totalTax: Number(inv.total_tax) || 0,
        grandTotal: Number(inv.grand_total) || 0,
        paidAmount: Number(inv.paid_amount) || 0,
        notes: inv.notes || '',
        ownerId: inv.owner_id,
        lineItems: (inv.invoice_line_items || []).map((li: any) => ({
          id: li.id,
          quoteId: '',
          productId: li.product_id,
          productName: li.product_name,
          description: li.description || '',
          quantity: li.quantity,
          unitPrice: Number(li.unit_price),
          discount: Number(li.discount) || 0,
          tax: Number(li.tax) || 0,
          total: Number(li.total),
        })),
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const generateFromQuote = async (quote: {
    id: string; dealName?: string; accountName?: string; contactName?: string;
    subtotal: number; totalTax: number; grandTotal: number; notes: string;
    lineItems: QuoteLineItem[];
  }) => {
    if (!user) return;

    const { data, error } = await supabase.from('invoices').insert({
      quote_id: quote.id,
      deal_name: quote.dealName,
      account_name: quote.accountName,
      contact_name: quote.contactName,
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal: quote.subtotal,
      total_tax: quote.totalTax,
      grand_total: quote.grandTotal,
      paid_amount: 0,
      notes: quote.notes,
      owner_id: user.id,
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    if (data && quote.lineItems.length > 0) {
      await supabase.from('invoice_line_items').insert(
        quote.lineItems.map(li => ({
          invoice_id: data.id,
          product_id: li.productId || null,
          product_name: li.productName,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          discount: li.discount,
          tax: li.tax,
          total: li.total,
        }))
      );
    }
    toast({ title: 'Invoice generated from quote' });
    fetchInvoices();
  };

  const updateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchInvoices();
    }
  };

  const markPaid = async (id: string, amount: number) => {
    const { error } = await supabase.from('invoices').update({ status: 'paid', paid_amount: amount }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invoice marked as paid' });
      fetchInvoices();
    }
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invoice deleted' });
      fetchInvoices();
    }
  };

  return { invoices, loading, generateFromQuote, updateInvoiceStatus, markPaid, deleteInvoice };
}
