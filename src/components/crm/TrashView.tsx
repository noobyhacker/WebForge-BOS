import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrashedItem {
  id: string;
  name: string;
  entityType: string;
  deletedAt: string;
  deletedBy?: string;
}

const ENTITY_TABLES = [
  { type: 'client', table: 'clients', nameCol: 'name' },
  { type: 'contact', table: 'contacts', nameCol: 'first_name' },
  { type: 'account', table: 'accounts', nameCol: 'name' },
  { type: 'deal', table: 'deals', nameCol: 'name' },
  { type: 'product', table: 'products', nameCol: 'name' },
  { type: 'quote', table: 'quotes', nameCol: 'quote_number' },
  { type: 'invoice', table: 'invoices', nameCol: 'invoice_number' },
] as const;

export function TrashView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchTrashed = useCallback(async () => {
    setLoading(true);
    const allItems: TrashedItem[] = [];

    for (const entity of ENTITY_TABLES) {
      const { data } = await supabase
        .from(entity.table)
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(50);

      for (const row of data || []) {
        const r = row as any;
        const nameValue = entity.type === 'contact'
          ? `${r.first_name} ${r.last_name || ''}`.trim()
          : r[entity.nameCol];
        allItems.push({
          id: r.id,
          name: nameValue || 'Unknown',
          entityType: entity.type,
          deletedAt: r.deleted_at,
          deletedBy: r.deleted_by,
        });
      }
    }

    allItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    setItems(allItems);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrashed(); }, [fetchTrashed]);

  const restore = useCallback(async (item: TrashedItem) => {
    setRestoring(item.id);
    const tableConfig = ENTITY_TABLES.find(e => e.type === item.entityType);
    if (!tableConfig) return;

    const { error } = await supabase
      .from(tableConfig.table)
      .update({ deleted_at: null, deleted_by: null } as any)
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to restore item.', variant: 'destructive' });
    } else {
      // Log to action_logs
      if (user) {
        await supabase.from('action_logs').insert({
          user_id: user.id,
          user_email: user.email || '',
          action_type: 'update',
          entity_type: item.entityType,
          entity_id: item.id,
          entity_name: item.name,
          details: 'Restored from trash',
        });
      }
      toast({ title: 'Restored', description: `${item.name} has been restored.` });
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
    setRestoring(null);
  }, [user, toast]);

  const activeTab = 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-muted-foreground" />
          Trash
        </h1>
        <p className="text-muted-foreground">View and restore soft-deleted records.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Trash is empty</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Deleted</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={`${item.entityType}-${item.id}`} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 capitalize text-muted-foreground">{item.entityType}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={restoring === item.id}
                          onClick={() => restore(item)}
                        >
                          {restoring === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
