import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Quote, QuoteLineItem, QuoteStatus } from '@/types/phase5';

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchQuotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, quote_line_items(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotes:', error);
      setLoading(false);
      return;
    }

    setQuotes(
      (data || []).map((q: any) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        dealId: q.deal_id,
        dealName: q.deal_name || '',
        accountId: q.account_id,
        accountName: q.account_name || '',
        contactId: q.contact_id,
        contactName: q.contact_name || '',
        status: q.status as QuoteStatus,
        validUntil: q.valid_until || '',
        subtotal: Number(q.subtotal) || 0,
        totalDiscount: Number(q.total_discount) || 0,
        totalTax: Number(q.total_tax) || 0,
        grandTotal: Number(q.grand_total) || 0,
        notes: q.notes || '',
        ownerId: q.owner_id,
        lineItems: (q.quote_line_items || []).map((li: any) => ({
          id: li.id,
          quoteId: li.quote_id,
          productId: li.product_id,
          productName: li.product_name,
          description: li.description || '',
          quantity: li.quantity,
          unitPrice: Number(li.unit_price),
          discount: Number(li.discount) || 0,
          tax: Number(li.tax) || 0,
          total: Number(li.total),
        })),
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const addQuote = async (quote: {
    dealId?: string; dealName?: string; accountName?: string; contactName?: string;
    status: QuoteStatus; validUntil: string; notes: string;
    lineItems: Omit<QuoteLineItem, 'id' | 'quoteId'>[];
  }) => {
    if (!user) return;
    const subtotal = quote.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const totalDiscount = quote.lineItems.reduce((s, li) => s + li.discount, 0);
    const totalTax = quote.lineItems.reduce((s, li) => s + li.tax, 0);
    const grandTotal = subtotal - totalDiscount + totalTax;

    const { data, error } = await supabase.from('quotes').insert({
      deal_id: quote.dealId || null,
      deal_name: quote.dealName || '',
      account_name: quote.accountName || '',
      contact_name: quote.contactName || '',
      status: quote.status,
      valid_until: quote.validUntil || null,
      subtotal, total_discount: totalDiscount, total_tax: totalTax, grand_total: grandTotal,
      notes: quote.notes,
      owner_id: user.id,
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    if (data && quote.lineItems.length > 0) {
      await supabase.from('quote_line_items').insert(
        quote.lineItems.map(li => ({
          quote_id: data.id,
          product_id: li.productId || null,
          product_name: li.productName,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          discount: li.discount,
          tax: li.tax,
          total: li.quantity * li.unitPrice - li.discount + li.tax,
        }))
      );
    }
    toast({ title: 'Quote created' });
    fetchQuotes();
  };

  const updateQuoteStatus = async (id: string, status: QuoteStatus) => {
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchQuotes();
    }
  };

  const updateQuote = async (id: string, updates: {
    dealName?: string; accountName?: string; contactName?: string;
    validUntil?: string; notes?: string;
    lineItems?: Omit<QuoteLineItem, 'id' | 'quoteId'>[];
  }) => {
    const lineItems = updates.lineItems;
    const subtotal = lineItems ? lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0) : undefined;
    const totalDiscount = lineItems ? lineItems.reduce((s, li) => s + li.discount, 0) : undefined;
    const totalTax = lineItems ? lineItems.reduce((s, li) => s + li.tax, 0) : undefined;
    const grandTotal = subtotal !== undefined && totalDiscount !== undefined && totalTax !== undefined
      ? subtotal - totalDiscount + totalTax : undefined;

    const dbUpdates: any = {};
    if (updates.dealName !== undefined) dbUpdates.deal_name = updates.dealName;
    if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName;
    if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
    if (updates.validUntil !== undefined) dbUpdates.valid_until = updates.validUntil || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (subtotal !== undefined) dbUpdates.subtotal = subtotal;
    if (totalDiscount !== undefined) dbUpdates.total_discount = totalDiscount;
    if (totalTax !== undefined) dbUpdates.total_tax = totalTax;
    if (grandTotal !== undefined) dbUpdates.grand_total = grandTotal;

    const { error } = await supabase.from('quotes').update(dbUpdates).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    if (lineItems) {
      await supabase.from('quote_line_items').delete().eq('quote_id', id);
      if (lineItems.length > 0) {
        await supabase.from('quote_line_items').insert(
          lineItems.map(li => ({
            quote_id: id, product_id: li.productId || null, product_name: li.productName,
            description: li.description, quantity: li.quantity, unit_price: li.unitPrice,
            discount: li.discount, tax: li.tax, total: li.quantity * li.unitPrice - li.discount + li.tax,
          }))
        );
      }
    }
    toast({ title: 'Quote updated' });
    fetchQuotes();
  };

  const deleteQuote = async (id: string) => {
    const { error } = await supabase.from('quotes').update({ deleted_at: new Date().toISOString(), deleted_by: user!.id }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Quote deleted' });
      fetchQuotes();
    }
  };

  return { quotes, loading, addQuote, updateQuote, updateQuoteStatus, deleteQuote };
}
