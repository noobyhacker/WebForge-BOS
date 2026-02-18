import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export function useProducts() {
  const { user, isApproved } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!user || !isApproved) { setProducts([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching products:', error); return; }
      setProducts((data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        sku: p.sku || '',
        isActive: p.is_active ?? true,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    } finally { setLoading(false); }
  }, [user, isApproved]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('products').insert({
      name: product.name,
      description: product.description,
      price: product.price,
      sku: product.sku,
      is_active: product.isActive,
    });
    if (error) { console.error('Error adding product:', error); throw error; }
    await fetchProducts();
  }, [user, fetchProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating product:', error); return; }
    await fetchProducts();
  }, [user, fetchProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', id);
    if (error) { console.error('Error deleting product:', error); return; }
    await fetchProducts();
  }, [user, fetchProducts]);

  return { products, loading, addProduct, updateProduct, deleteProduct, refetch: fetchProducts };
}
