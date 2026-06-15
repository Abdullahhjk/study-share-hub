import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, Pencil, Trash2, Bell, Loader2 } from "lucide-react";
import { ActivityLogger } from "@/hooks/useActivityLogger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function NotificationsTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [deleteNotifId, setDeleteNotifId] = useState<string | null>(null);
  const [deleteNotifDialogOpen, setDeleteNotifDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [targetUser, setTargetUser] = useState("all");
  const [editNotif, setEditNotif] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      return data || [];
    },
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const sendNotification = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("notifications").insert({
        title, message,
        user_id: targetUser === "all" ? null : targetUser,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      ActivityLogger.sendNotification(targetUser === "all" ? "broadcast" : targetUser);
      toast.success("Notification sent!");
      setTitle(""); setMessage(""); setTargetUser("all");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateNotification = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({
        title: editTitle, message: editMessage,
      }).eq("id", editNotif.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("Notification updated");
      setEditNotif(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("Notification deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditNotif = (n: any) => {
    setEditNotif(n);
    setEditTitle(n.title);
    setEditMessage(n.message);
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Send Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Notification title..." value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Notification message..." value={message} onChange={e => setMessage(e.target.value)} />
          <div className="flex gap-2">
            <Select value={targetUser} onValueChange={setTargetUser}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users (Broadcast)</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => sendNotification.mutate()} disabled={!title.trim() || !message.trim() || sendNotification.isPending}>
              {sendNotification.isPending ? <Loader2 className="h-4 w-4 animate-spin inline-block" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>Manage previously sent notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No notifications sent yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{n.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={n.user_id ? "secondary" : "default"} className="text-[10px]">
                        {n.user_id ? "Targeted" : "Broadcast"}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditNotif(n)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setDeleteNotifId(n.id); setDeleteNotifDialogOpen(true); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editNotif} onOpenChange={open => !open && setEditNotif(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Notification</DialogTitle>
            <DialogDescription>Update the notification content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
            <div className="space-y-1"><Label>Message</Label><Textarea value={editMessage} onChange={e => setEditMessage(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => updateNotification.mutate()} disabled={updateNotification.isPending}>
              {updateNotification.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteNotifDialogOpen} onOpenChange={setDeleteNotifDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>Are you sure you want to delete this notification?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNotifDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!deleteNotifId) return;
              deleteNotification.mutate(deleteNotifId, { onSettled: () => { setDeleteNotifDialogOpen(false); setDeleteNotifId(null); } });
            }} disabled={deleteNotification.isPending}>
              {deleteNotification.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
