import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Users, Search, Pencil, Database, LogIn, Trash2,
  KeyRound, FileText, MessageSquare, DollarSign, TrendingUp, Activity,
  School, Loader2, Plus, Eye, EyeOff, MoreVertical, ShieldOff, ShieldCheck
} from "lucide-react";
import { ActivityLogger } from "@/hooks/useActivityLogger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { getTaxRate } from "@/lib/admin-settings";
import { toast } from "sonner";
import { format } from "date-fns";
import { MiniStat } from "./OverviewTab";

const TAX_RATE = getTaxRate();

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

function canModify(userRole: string | undefined, targetRole: string): boolean {
  if (userRole === "admin") return true;
  if (userRole === "coadmin") return targetRole === "teacher" || targetRole === "pending" || targetRole === "blocked" || targetRole === "rejected" || targetRole === "deleted";
  return false;
}


function UserActionsMobile({ u, currentUser, openEdit, setStatsUser, setDeleteUserId, setDeleteUserDialogOpen, openImpersonate, userRole }: any) {
  const isProtected = !canModify(userRole, u.role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => openEdit(u)} disabled={isProtected && u.user_id !== currentUser?.id}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatsUser(u)}>
          <Database className="h-3.5 w-3.5 mr-2" /> Data Usage & Stats
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openImpersonate(u)} disabled={isProtected}>
          <LogIn className="h-3.5 w-3.5 mr-2" /> Login as User
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => { setDeleteUserId(u.user_id); setDeleteUserDialogOpen(true); }}
          disabled={u.user_id === currentUser?.id || isProtected}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface UsersTabProps {
  userRole?: string;
}

export default function UsersTab({ userRole }: UsersTabProps) {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", school_name: "", phone: "", role: "" });
  const [statsUser, setStatsUser] = useState<any>(null);
  const [impersonateUser, setImpersonateUser] = useState<any>(null);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: "", password: "", role: "teacher", full_name: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [bulkTargetRole, setBulkTargetRole] = useState("teacher");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user || null;
    },
    refetchOnWindowFocus: false,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name, email, school_name, phone, created_at"),
      ]);
      return (rolesRes.data || []).map(r => ({ ...r, profile: (profilesRes.data || []).find(p => p.id === r.user_id) }));
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", statsUser?.user_id],
    queryFn: async () => {
      const uid = statsUser.user_id;
      const [notesRes, requestsRes, logsRes] = await Promise.all([
        supabase.from("notes").select("id, price, is_free", { count: "exact" }).eq("teacher_id", uid),
        supabase.from("note_requests").select("id, total_amount, status").eq("teacher_id", uid),
        supabase.from("activity_logs").select("id", { count: "exact" }).eq("user_id", uid),
      ]);
      const notes = notesRes.data || [];
      const requests = requestsRes.data || [];
      const completedRevenue = requests.filter(r => r.status === "completed").reduce((s, r) => s + (r.total_amount || 0), 0);
      const pendingRevenue = requests.filter(r => r.status === "pending").reduce((s, r) => s + (r.total_amount || 0), 0);
      const gross = completedRevenue;
      const taxRate = getTaxRate();
      return { totalNotes: notesRes.count || 0, totalRequests: requests.length, completedRevenue, pendingRevenue, gross, taxRate, platformCharge: gross * taxRate, net: gross - gross * taxRate, activityCount: logsRes.count || 0 };
    },
    enabled: !!statsUser?.user_id,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const uid = editUser.user_id;
      const { error: profileErr } = await supabase.from("profiles").update({
        full_name: editForm.full_name, phone: editForm.phone || null, school_name: editForm.school_name || null,
      } as any).eq("id", uid);
      if (profileErr) throw profileErr;
      if (editForm.role !== editUser.role) {
        if (!canModify(userRole, editUser.role)) throw new Error("You don't have permission to change this user's role");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-change-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ target_user_id: uid, new_role: editForm.role }),
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      ActivityLogger.roleChange(editUser.user_id, editForm.role);
      toast.success("User updated");
      setEditUser(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ target_user_id: userId }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      ActivityLogger.deleteUser(userId);
      toast.success("User permanently deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(createUserForm),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
      setCreateUserDialogOpen(false);
      setCreateUserForm({ email: "", password: "", role: "teacher", full_name: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkBlock = useMutation({
    mutationFn: async () => {
      const ids = [...selectedUsers];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const results = await Promise.allSettled(ids.map(uid =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-change-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ target_user_id: uid, new_role: "blocked" }),
        }).then(r => r.json())
      ));
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").length;
      if (failures === ids.length) throw new Error("All bulk block operations failed");
      return { blocked: ids.length - failures, failures };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUsers(new Set());
      toast.success(`Blocked ${data.blocked} users`);
      if (data.failures > 0) toast.warning(`${data.failures} users could not be blocked`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = [...selectedUsers];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const results = await Promise.allSettled(ids.map(uid =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ target_user_id: uid }),
        }).then(r => r.json())
      ));
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").length;
      if (failures === ids.length) throw new Error("All bulk delete operations failed");
      return { deleted: ids.length - failures, failures };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUsers(new Set());
      toast.success(`Deleted ${data.deleted} users`);
      if (data.failures > 0) toast.warning(`${data.failures} users could not be deleted`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkChangeRole = useMutation({
    mutationFn: async () => {
      const ids = [...selectedUsers];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const results = await Promise.allSettled(ids.map(uid =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-change-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ target_user_id: uid, new_role: bulkTargetRole }),
        }).then(r => r.json())
      ));
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").length;
      if (failures === ids.length) throw new Error("All bulk role change operations failed");
      return { changed: ids.length - failures, failures };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUsers(new Set());
      setBulkRoleDialogOpen(false);
      toast.success(`Changed ${data.changed} users to ${bulkTargetRole}`);
      if (data.failures > 0) toast.warning(`${data.failures} users could not be changed`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelectAll = () => {
    if (selectedUsers.size === filtered.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filtered.map(u => u.user_id)));
    }
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleImpersonate = async () => {
    if (!impersonateUser?.user_id) return;
    setIsImpersonating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("admin-impersonate", {
        body: { target_user_id: impersonateUser.user_id },
      });
      if (error) throw new Error(error.message);
      const magicLink = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/verify?token=${result.token_hash}&type=magiclink&redirect_to=${window.location.origin}/dashboard`;
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = magicLink;
    } catch (e: any) {
      toast.error(e.message || "Failed to impersonate");
    } finally {
      setIsImpersonating(false);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || u.profile?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const openEdit = (u: any) => {
    if (!canModify(userRole, u.role) && u.user_id !== currentUser?.id) {
      toast.error("You can only edit teacher or pending accounts");
      return;
    }
    setEditUser(u);
    setEditForm({ full_name: u.profile?.full_name || "", email: u.profile?.email || "", school_name: u.profile?.school_name || "", phone: u.profile?.phone || "", role: u.role });
  };

  const openImpersonate = (u: any) => {
    if (!canModify(userRole, u.role)) {
      toast.error("You can only impersonate teacher or pending accounts");
      return;
    }
    if (!u?.profile?.email) { toast.error("User has no email"); return; }
    setImpersonateUser(u);
    setImpersonateDialogOpen(true);
  };

  const selectedUser = users.find(u => u.user_id === deleteUserId);
  const profile = selectedUser?.profile;

  const roleOptions = userRole === "admin"
    ? ["admin", "coadmin", "teacher", "pending"]
    : ["teacher", "pending"];

  return (
    <TooltipProvider>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> User Management</CardTitle>
          <CardDescription>View, edit, and manage all registered users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="coadmin">Co-Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            {userRole === "admin" && (
              <Button onClick={() => setCreateUserDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create User
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <>
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-medium">{selectedUsers.size} selected</span>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setBulkRoleDialogOpen(true)}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Change Role
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => bulkBlock.mutate()} disabled={bulkBlock.isPending}>
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Block
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => bulkDelete.mutate()} disabled={bulkDelete.isPending}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedUsers(new Set())}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox checked={selectedUsers.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(u => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <Checkbox checked={selectedUsers.has(u.user_id)} onCheckedChange={() => toggleSelectUser(u.user_id)} />
                        </TableCell>
                        <TableCell className="font-medium">{u.profile?.full_name || "Unknown"}</TableCell>
                        <TableCell className="text-xs">{u.profile?.email || "N/A"}</TableCell>
                        <TableCell className="truncate max-w-[200px]">{u.profile?.school_name || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <RoleBadge role={u.role} />
                        </TableCell>
                        <TableCell className="text-xs">{u.profile?.created_at ? format(new Date(u.profile.created_at), "MMM d, yyyy") : "N/A"}</TableCell>
                        <TableCell>
                          <UserActionsMobile u={u} currentUser={currentUser} openEdit={openEdit} setStatsUser={setStatsUser} setDeleteUserId={setDeleteUserId} setDeleteUserDialogOpen={setDeleteUserDialogOpen} openImpersonate={openImpersonate} userRole={userRole} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map(u => (
                  <div key={u.user_id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{u.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.profile?.email || "N/A"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <RoleBadge role={u.role} />
                        <UserActionsMobile u={u} currentUser={currentUser} openEdit={openEdit} setStatsUser={setStatsUser} setDeleteUserId={setDeleteUserId} setDeleteUserDialogOpen={setDeleteUserDialogOpen} openImpersonate={openImpersonate} userRole={userRole} />
                      </div>
                    </div>
                    {u.profile?.school_name && <p className="text-xs text-muted-foreground flex items-center"><School className="text-primary h-4 w-4 mr-2" /> {u.profile.school_name}</p>}
                    <p className="text-[10px] text-muted-foreground">Joined {u.profile?.created_at ? format(new Date(u.profile.created_at), "MMM d, yyyy") : "N/A"}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit User</DialogTitle>
            <DialogDescription>Update user details and role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Full Name</Label><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Email</Label><Input value={editForm.email} disabled className="opacity-60" /><p className="text-[10px] text-muted-foreground">Email cannot be changed.</p></div>
            <div className="space-y-1"><Label>School/Institution</Label><Input value={editForm.school_name} onChange={e => setEditForm(f => ({ ...f, school_name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!roleOptions.includes("coadmin") && (
                    <SelectItem value="coadmin" disabled>Co-Admin</SelectItem>
                  )}
                  {roleOptions.map(r => (
                    <SelectItem key={r} value={r}>{r === "coadmin" ? "Co-Admin" : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              {userRole === "coadmin" && (
                <p className="text-[10px] text-muted-foreground mt-1">You can only assign Teacher, Pending, Blocked, Rejected or Deleted roles.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog open={impersonateDialogOpen} onOpenChange={open => { if (!open) { setImpersonateDialogOpen(false); setImpersonateUser(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Impersonate User</DialogTitle>
            <DialogDescription>Generate a login link for <strong>{impersonateUser?.profile?.email}</strong> ({impersonateUser?.role}). You will be logged in as this user.</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Target user will not receive any email notification. A direct login link will be opened in your browser.</p>
          <DialogFooter className="flex-col gap-2">
            <DialogClose asChild><Button variant="outline" className="w-full">Cancel</Button></DialogClose>
            <Button onClick={handleImpersonate} disabled={isImpersonating} className="w-full">
              {isImpersonating ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : null}Generate Magic Link & Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={!!statsUser} onOpenChange={open => !open && setStatsUser(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
              <Database className="h-4 w-4 shrink-0" />
              <span>Data Usage — {statsUser?.profile?.full_name}</span>
            </DialogTitle>
            <DialogDescription>Usage statistics and billable amounts.</DialogDescription>
          </DialogHeader>
          {userStats ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Notes Uploaded" value={userStats.totalNotes} icon={<FileText className="h-3.5 w-3.5" />} />
              <MiniStat label="Requests" value={userStats.totalRequests} icon={<MessageSquare className="h-3.5 w-3.5" />} />
              <MiniStat label="Completed Revenue" value={formatPrice(userStats.completedRevenue)} icon={<DollarSign className="h-3.5 w-3.5 text-success" />} />
              <MiniStat label="Pending Revenue" value={formatPrice(userStats.pendingRevenue)} icon={<DollarSign className="h-3.5 w-3.5 text-warning" />} />
              <MiniStat label="Gross Revenue" value={formatPrice(userStats.gross)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              <MiniStat label={`Platform Charge (${Math.round(userStats.taxRate * 100)}%)`} value={formatPrice(userStats.platformCharge)} icon={<DollarSign className="h-3.5 w-3.5 text-destructive" />} />
              <MiniStat label="Net Earnings" value={formatPrice(userStats.net)} icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} />
              <div className="col-span-2">
                <MiniStat label="Activity Logs" value={userStats.activityCount} icon={<Activity className="h-3.5 w-3.5" />} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User "{profile?.full_name || "Unknown"}"</DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="text-sm">This will permanently delete this user and <strong>ALL their data</strong>.</span>
              <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-xs">
                <p><span className="font-medium">Name:</span> {profile?.full_name || "Unknown"}</p>
                <p><span className="font-medium">Email:</span> {profile?.email || "Unknown"}</p>
                <p><span className="font-medium">School:</span> {profile?.school_name || "—"}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!deleteUserId) return;
              deleteUser.mutate(deleteUserId, { onSettled: () => { setDeleteUserDialogOpen(false); setDeleteUserId(null); } });
            }} disabled={deleteUser.isPending}>
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />}Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Create User</DialogTitle>
            <DialogDescription>Create a new user with email and password. Account will be auto-verified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                value={createUserForm.full_name}
                onChange={e => setCreateUserForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={createUserForm.email}
                onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
                type="email"
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  value={createUserForm.password}
                  onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={createUserForm.role} onValueChange={v => setCreateUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)} disabled={createUser.isPending}>Cancel</Button>
            <Button
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !createUserForm.email || !createUserForm.password}
            >
              {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Role Change Dialog */}
      <Dialog open={bulkRoleDialogOpen} onOpenChange={setBulkRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Bulk Role Change</DialogTitle>
            <DialogDescription>Change role for {selectedUsers.size} selected users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>New Role</Label>
              <Select value={bulkTargetRole} onValueChange={setBulkTargetRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map(r => (
                    <SelectItem key={r} value={r}>{r === "coadmin" ? "Co-Admin" : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => bulkChangeRole.mutate()} disabled={bulkChangeRole.isPending}>
              {bulkChangeRole.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : null}
              Apply to {selectedUsers.size} users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
