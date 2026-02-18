import { useState } from "react";
import { useFeatureFlags, type FeatureFlag } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/crm/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FlagForm {
  key: string;
  label: string;
  description: string;
  scope: string;
  is_enabled: boolean;
}

const emptyForm: FlagForm = {
  key: "",
  label: "",
  description: "",
  scope: "global",
  is_enabled: false,
};

export function FeatureFlagsView() {
  const { isAdmin } = useAuth();
  const { flags, isLoading, create, update, remove } = useFeatureFlags();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlagForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (flag: FeatureFlag) => {
    setEditingId(flag.id);
    setForm({
      key: flag.key,
      label: flag.label,
      description: flag.description ?? "",
      scope: flag.scope,
      is_enabled: flag.is_enabled,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.label.trim()) {
      toast({ title: "Key and label are required", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...form });
        toast({ title: "Flag updated" });
      } else {
        await create.mutateAsync(form);
        toast({ title: "Flag created" });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await update.mutateAsync({ id: flag.id, is_enabled: !flag.is_enabled });
      toast({ title: `${flag.label} ${!flag.is_enabled ? "enabled" : "disabled"}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      toast({ title: "Flag deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">Toggle features on or off across the application.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Flag
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : flags.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Flag className="h-10 w-10" />
              <p>No feature flags yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={() => handleToggle(flag)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{flag.key}</TableCell>
                    <TableCell className="font-medium">{flag.label}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{flag.scope}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {flag.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(flag)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(flag.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Flag" : "New Feature Flag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                placeholder="e.g. dark_mode_v2"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                disabled={!!editingId}
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="Dark Mode V2"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What does this flag control?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_enabled}
                onCheckedChange={(v) => setForm({ ...form, is_enabled: v })}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              {editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Feature Flag"
        description="This will permanently remove this feature flag. Any code using this flag will fall back to its default behavior."
        onConfirm={handleDelete}
      />
    </div>
  );
}
