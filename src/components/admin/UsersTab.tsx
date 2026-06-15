import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Users, Search, Pencil, Database, LogIn, Trash2,
  KeyRound, FileText, MessageSquare, DollarSign, TrendingUp, Activity,
  School, Loader2
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
import { toast } from "sonner";
import { format } from "date-fns";
import { MiniStat } from "./OverviewTab";

const TAX_RATE = 0.15;

function UserActions({ u, currentUser, openEdit, setStatsUser, setDeleteUserId, setDeleteUserDialogOpen, openImpersonate }: any) {
  return (
    <div className="flex gap-1 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(u)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit User</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setStatsUser(u)}>
            <Database className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Data Usage & Stats</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openImpersonate(u)}>
            <LogIn className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Login as User</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={u.role === "admin" ? "outline" : "destructive"}
            className="h-8 w-8"
            onClick={() => { setDeleteUserId(u.user_id); setDeleteUserDialogOpen(true); }}
            disabled={u.user_id === currentUser?.id}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {u.user_id === currentUser?.id ? "You can't remove yourself" : u.role === "admin" ? "Delete This Admin" : "Delete This User & All Data"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function UsersTab() {
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
      const notesPriceTotal = notes.filter(n => !n.is_free).reduce((s, n) => s + (n.price || 0), 0);
      const gross = completedRevenue + notesPriceTotal;
      return { totalNotes: notesRes.count || 0, totalRequests: requests.length, completedRevenue, pendingRevenue, notesPriceTotal, gross, platformCharge: gross * TAX_RATE, net: gross - gross * TAX_RATE, activityCount: logsRes.count || 0 };
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
        const { error: roleErr } = await supabase.from("user_roles").update({ role: editForm.role as any }).eq("user_id", uid);
        if (roleErr) throw roleErr;
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

  const handleImpersonate = async () => {
    if (!impersonateUser?.user_id) return;
    setIsImpersonating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-impersonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ target_user_id: impersonateUser.user_id }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      const magicLink = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/verify?token=${result.token_hash}&type=magiclink&redirect_to=${window.location.origin}/dashboard`;
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
    setEditUser(u);
    setEditForm({ full_name: u.profile?.full_name || "", email: u.profile?.email || "", school_name: u.profile?.school_name || "", phone: u.profile?.phone || "", role: u.role });
  };

  const openImpersonate = (u: any) => {
    if (!u?.profile?.email) { toast.error("User has no email"); return; }
    setImpersonateUser(u);
    setImpersonateDialogOpen(true);
  };

  const selectedUser = users.find(u => u.user_id === deleteUserId);
  const profile = selectedUser?.profile;

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
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        <TableCell className="font-medium">{u.profile?.full_name || "Unknown"}</TableCell>
                        <TableCell className="text-xs">{u.profile?.email || "N/A"}</TableCell>
                        <TableCell>{u.profile?.school_name || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : u.role === "teacher" ? "secondary" : "outline"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{u.profile?.created_at ? format(new Date(u.profile.created_at), "MMM d, yyyy") : "N/A"}</TableCell>
                        <TableCell>
                          <UserActions u={u} currentUser={currentUser} openEdit={openEdit} setStatsUser={setStatsUser} setDeleteUserId={setDeleteUserId} setDeleteUserDialogOpen={setDeleteUserDialogOpen} openImpersonate={openImpersonate} />
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
                      <Badge variant={u.role === "admin" ? "default" : u.role === "teacher" ? "secondary" : "outline"} className="shrink-0">{u.role}</Badge>
                    </div>
                    {u.profile?.school_name && <p className="text-xs text-muted-foreground flex items-center"><School className="text-primary h-4 w-4 mr-2" /> {u.profile.school_name}</p>}
                    <p className="text-[10px] text-muted-foreground">Joined {u.profile?.created_at ? format(new Date(u.profile.created_at), "MMM d, yyyy") : "N/A"}</p>
                    <div className="pt-1 border-t">
                      <UserActions u={u} currentUser={currentUser} openEdit={openEdit} setStatsUser={setStatsUser} setDeleteUserId={setDeleteUserId} setDeleteUserDialogOpen={setDeleteUserDialogOpen} openImpersonate={openImpersonate} />
                    </div>
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
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogDescription>Generate a login link for <strong>{impersonateUser?.profile?.email}</strong>. You will be logged in as this user.</DialogDescription>
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
              <MiniStat label="Notes Price Total" value={formatPrice(userStats.notesPriceTotal)} icon={<DollarSign className="h-3.5 w-3.5" />} />
              <MiniStat label="Gross Revenue" value={formatPrice(userStats.gross)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              <MiniStat label="Platform Charge (15%)" value={formatPrice(Math.round(userStats.platformCharge))} icon={<DollarSign className="h-3.5 w-3.5 text-destructive" />} />
              <MiniStat label="Net Earnings" value={formatPrice(Math.round(userStats.net))} icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} />
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
              <p className="text-sm">This will permanently delete this user and <strong>ALL their data</strong>.</p>
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
    </TooltipProvider>
  );
}
