import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, Pencil, Trash2, Bell, Loader2 } from "lucide-react";
import { ActivityLogger } from "@/hooks/useActivityLogger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { SendNotificationModal } from "./SendNotificationModal";

export default function NotificationsTab() {
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const [deleteNotifId, setDeleteNotifId] = useState<string | null>(null);
  const [deleteNotifDialogOpen, setDeleteNotifDialogOpen] = useState(false);
  const [editNotif, setEditNotif] = useState<any>(null);

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
    setSendOpen(true);
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4" />
            Send a Notification
          </CardTitle>

          <Button
            size="sm"
            onClick={() => { setEditNotif(null); setSendOpen(true); }}
            className="w-full gap-1.5 sm:w-auto"
          >
            <Send className="h-4 w-4" />
            New Notification
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>Manage previously sent notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No notifications sent yet.
            </p>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="break-words text-sm font-medium">
                      {n.title}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                      <Badge
                        variant={n.user_id ? "secondary" : "default"}
                        className="text-[10px]"
                      >
                        {n.user_id ? "Targeted" : "Broadcast"}
                      </Badge>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditNotif(n)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setDeleteNotifId(n.id);
                          setDeleteNotifDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="break-words text-xs text-muted-foreground">
                    {n.message}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(n.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      <SendNotificationModal
        open={sendOpen}
        onOpenChange={(v) => { setSendOpen(v); if (!v) setEditNotif(null); }}
        recipients={users}
        recipientId={editNotif?.user_id ?? null}
        editTarget={editNotif}
        onSent={(id) => ActivityLogger.sendNotification(id === null ? "broadcast" : id)}
      />
    </div>
  );
}
