import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, Pencil, Trash2, Bell, Loader2, History, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityLogger } from "@/hooks/useActivityLogger";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { format } from "date-fns";
import { SendNotificationModal } from "./SendNotificationModal";
import NotificationMarkdown from "@/components/notifications/NotificationMarkdown";
import { TeacherNotifications } from "@/components/dashboard/TeacherNotifications";

interface NotificationVersion {
  id: string;
  notification_id: string;
  version: number;
  title: string;
  message: string;
  user_id: string | null;
  edited_by: string | null;
  created_at: string;
  editor?: { full_name: string | null } | null;
}

const PAGE_SIZE = 10;

export default function NotificationsTab() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const isAdminExact = role === "admin";

  const [sendOpen, setSendOpen] = useState(false);
  const [deleteNotifId, setDeleteNotifId] = useState<string | null>(null);
  const [deleteNotifDialogOpen, setDeleteNotifDialogOpen] = useState(false);
  const [editNotif, setEditNotif] = useState<any>(null);
  const [historyNotif, setHistoryNotif] = useState<any>(null);
  const [page, setPage] = useState(0);

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

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["notification-versions", historyNotif?.id],
    queryFn: async () => {
      if (!historyNotif) return [];
      const { data } = await supabase
        .from("notification_versions")
        .select("*, editor:profiles!notification_versions_edited_by_fkey(full_name)")
        .eq("notification_id", historyNotif.id)
        .order("version", { ascending: false });
      return (data || []) as unknown as NotificationVersion[];
    },
    enabled: !!historyNotif,
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

  const restoreVersion = useMutation({
    mutationFn: async ({ notificationId, title, message }: { notificationId: string; title: string; message: string }) => {
      const { error } = await supabase.from("notifications").update({ title, message }).eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-versions", variables.notificationId] });
      toast.success("Content restored — the previous content was saved to history");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditNotif = (n: any) => {
    setEditNotif(n);
    setSendOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = notifications.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const recipientLabel = (userId: string | null) => {
    if (!userId) return "All Users (Broadcast)";
    return users.find((u: any) => u.id === userId)?.full_name ?? "Unknown User";
  };

  return (
    <div className="space-y-6 mt-4">
      <Tabs defaultValue="inbox">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="inbox" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Your Notifications
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Create &amp; Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          {user?.id ? (
            <TeacherNotifications userId={user.id} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Send className="h-4 w-4" />
                  Send a Notification
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Markdown and LaTeX are supported ($inline$ or $$block$$ math).
                  {!isAdminExact && " As co-admin you can create and edit notifications; deletion is restricted to admins."}
                </CardDescription>
              </div>

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
              <CardDescription>
                Manage previously sent notifications.{isAdminExact ? " Admins can also delete them." : ""}
              </CardDescription>
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
                <div className="space-y-3">
                  <Accordion type="single" collapsible className="space-y-2">
                    {pageItems.map((n) => (
                      <AccordionItem key={n.id} value={n.id} className="border rounded-lg px-3">
                        <AccordionTrigger className="py-1.5 hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
                          <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <span className="truncate text-sm font-medium">{n.title}</span>
                            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                              → {recipientLabel(n.user_id)}
                            </span>
                            <Badge variant="outline" className="ml-auto mr-2 shrink-0 px-1.5 text-[10px]">
                              v{n.current_version ?? 1}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <NotificationMarkdown
                            content={n.message}
                            className="text-xs text-muted-foreground [&_.katex]:text-[1em] [&_.katex-display]:my-1 [&_.katex-display]:overflow-x-auto"
                          />

                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2">
                            <p className="mr-auto text-[10px] text-muted-foreground">
                              {recipientLabel(n.user_id)} · {format(new Date(n.created_at), "MMM d, yyyy h:mm a")}
                            </p>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => setHistoryNotif(n)}
                            >
                              <History className="h-3 w-3" />
                              History
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => openEditNotif(n)}
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>

                            {isAdminExact && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteNotifId(n.id);
                                  setDeleteNotifDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">
                        Page {safePage + 1} of {totalPages}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={safePage >= totalPages - 1}
                        onClick={() => setPage(safePage + 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <Dialog open={!!historyNotif} onOpenChange={(v) => !v && setHistoryNotif(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Version History
            </DialogTitle>
            <DialogDescription>
              Previous versions of "{historyNotif?.title}". Restoring records the current content as a new version.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-2">
            {versionsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : versions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No previous versions — this notification has never been edited.
              </p>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="break-words text-sm font-medium">{v.title}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          v{v.version} · {format(new Date(v.created_at), "MMM d, yyyy h:mm a")}
                          {v.editor?.full_name ? ` · edited by ${v.editor.full_name}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 gap-1 px-2 text-xs"
                        disabled={restoreVersion.isPending || (historyNotif.title === v.title && historyNotif.message === v.message)}
                        onClick={() =>
                          restoreVersion.mutate({
                            notificationId: v.notification_id,
                            title: v.title,
                            message: v.message,
                          })
                        }
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                    </div>
                    <NotificationMarkdown
                      content={v.message}
                      className="text-xs text-muted-foreground [&_.katex]:text-[1em] [&_.katex-display]:my-1 [&_.katex-display]:overflow-x-auto"
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
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
