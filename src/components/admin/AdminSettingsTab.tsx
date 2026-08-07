import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PlatformSettingsRow = Database["public"]["Tables"]["platform_settings"]["Row"];
type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Settings, Users, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SettingsForm {
  id: string | null;
  commission: string;
  code: string;
  min_price: string;
  max_price: string;
}

const EMPTY_FORM: SettingsForm = { id: null, commission: "12.0", code: "PKR", min_price: "0", max_price: "100000" };

const roleBadgeConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string; label: string }> = {
  admin: { variant: "destructive", className: "bg-red-500/15 text-red-600 hover:bg-red-500/25 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30", label: "Admin" },
  coadmin: { variant: "default", className: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30", label: "Co-Admin" },
  teacher: { variant: "secondary", className: "bg-sky-500/15 text-sky-600 hover:bg-sky-500/25 border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30", label: "Teacher" },
  pending: { variant: "outline", className: "border-dashed border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400", label: "Pending" },
  rejected: { variant: "outline", className: "text-muted-foreground/70 border-muted-foreground/30 bg-muted/30", label: "Rejected" },
  deleted: { variant: "outline", className: "text-muted-foreground/40 border-muted-foreground/20 line-through bg-muted/20", label: "Deleted" },
  blocked: { variant: "destructive", className: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30", label: "Blocked" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = roleBadgeConfig[role] || roleBadgeConfig.pending;
  return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>;
}

export default function AdminSettingsTab() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PlatformSettingsRow | null>(null);

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roleRows = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-user-role-settings"],
    queryFn: async () => {
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role, settings_id"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (rolesRes.error) throw rolesRes.error;
      if (profilesRes.error) throw profilesRes.error;
      return (rolesRes.data || []).map(r => ({ ...r, profile: (profilesRes.data || []).find(p => p.id === r.user_id) }));
    },
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload = {
        commission: parseFloat(form.commission) || 0,
        code: form.code.trim(),
        min_price: parseFloat(form.min_price) || 0,
        max_price: parseFloat(form.max_price) || 0,
        updated_at: new Date().toISOString(),
      };
      if (payload.min_price > payload.max_price) throw new Error("Min price cannot exceed max price");
      if (form.id) {
        const { error } = await supabase.from("platform_settings").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_settings").insert({ ...payload, id: crypto.randomUUID() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast.success(form.id ? "Settings updated" : "Settings created");
      setFormOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSettings = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_settings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast.success("Settings deleted");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const changeRoleSettings = useMutation({
    mutationFn: async ({ roleId, settingsId }: { roleId: string; settingsId: string }) => {
      const { error } = await supabase.from("user_roles").update({ settings_id: settingsId }).eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-role-settings"] });
      toast.success("User settings assignment updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (s: PlatformSettingsRow) => {
    setForm({
      id: s.id,
      commission: String(s.commission),
      code: s.code,
      min_price: String(s.min_price),
      max_price: String(s.max_price),
    });
    setFormOpen(true);
  };

  const shortId = (id: string) => id.slice(0, 8);

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Platform Settings</CardTitle>
          <CardDescription>Add, edit, or delete platform-wide settings rows like commission rates and price limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Settings
            </Button>
          </div>

          {settingsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : settings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No platform settings found.</p>
          ) : (
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Commission (%)</TableHead>
                    <TableHead>Min Price</TableHead>
                    <TableHead>Max Price</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{shortId(s.id)}</TableCell>
                      <TableCell className="font-medium">{s.code}</TableCell>
                      <TableCell>{s.commission}%</TableCell>
                      <TableCell>{s.min_price} {s.code}</TableCell>
                      <TableCell>{s.max_price} {s.code}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.created_at), "MMM d, yyyy")}<br />{format(new Date(s.created_at), "hh:mm:ss a")}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.updated_at), "MMM d, yyyy")}<br />{format(new Date(s.updated_at), "hh:mm:ss a")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(s)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="md:hidden space-y-3">
            {settings.map(s => (
              <div key={s.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{shortId(s.id)}</p>
                    <p className="font-medium text-sm">{s.code} — {s.commission}% commission</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Min {s.min_price} / Max {s.max_price}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> User Role Settings Assignment</CardTitle>
          <CardDescription>Assign a platform settings row to each user role via the settings_id column.</CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : roleRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No user roles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Settings (settings_id)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleRows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{r.profile?.email || r.user_id}</p>
                      </TableCell>
                      <TableCell><RoleBadge role={r.role} /></TableCell>
                      <TableCell>
                        <Select
                          value={r.settings_id}
                          onValueChange={(v) => changeRoleSettings.mutate({ roleId: r.id, settingsId: v })}
                          disabled={changeRoleSettings.isPending}
                        >
                          <SelectTrigger className="w-full sm:max-w-[280px]">
                            <SelectValue placeholder="Select settings" />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.code} — {s.commission}% ({shortId(s.id)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {form.id ? "Edit Platform Settings" : "Add Platform Settings"}
            </DialogTitle>
            <DialogDescription>
              {form.id ? `Editing row ${shortId(form.id)}.` : "Create a new platform settings row."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Currency Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={3} placeholder="PKR" />
            </div>
            <div className="space-y-1">
              <Label>Commission (%)</Label>
              <Input type="number" step="0.01" min="0" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Min Price</Label>
                <Input type="number" step="1" min="0" value={form.min_price} onChange={e => setForm(f => ({ ...f, min_price: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Max Price</Label>
                <Input type="number" step="1" min="0" value={form.max_price} onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <DialogClose asChild><Button variant="outline" disabled={saveSettings.isPending}>Cancel</Button></DialogClose>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || !form.code.trim()}>
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : <Save className="h-4 w-4 mr-1 inline-block" />}
              {form.id ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Platform Settings "{deleteTarget?.code}"</DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="text-sm">This will permanently delete settings row <strong className="font-mono">{shortId(deleteTarget?.id || "")}</strong>.</span>
              <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-xs">
                <p><span className="font-medium">Code:</span> {deleteTarget?.code}</p>
                <p><span className="font-medium">Commission:</span> {deleteTarget?.commission}%</p>
                <p><span className="font-medium">Price range:</span> {deleteTarget?.min_price} — {deleteTarget?.max_price}</p>
              </div>
              <p className="text-xs text-destructive">Deletion will fail if any user role is currently assigned to this row.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteSettings.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteSettings.mutate(deleteTarget.id)} disabled={deleteSettings.isPending}>
              {deleteSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
