import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeacherNotificationsProps {
  userId: string;
}

export function TeacherNotifications({ userId }: TeacherNotificationsProps) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["teacher-notifications", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-notifications", userId] }),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_dismissed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-notifications", userId] });
      toast.success("Notification dismissed");
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Bell className="h-5 w-5" /> Notifications
        </CardTitle>
        <CardDescription>Messages and alerts from the platform admin.</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No notifications. You're all caught up!</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {notifications.map((n: any) => (
              <div key={n.id} className={`rounded-lg border p-3 space-y-1 ${!n.is_read ? 'bg-accent/20 border-primary/30' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  {!n.is_read && <Badge variant="default" className="text-[10px] shrink-0">New</Badge>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), "MMM d, yyyy h:mm a")}</p>
                  <div className="flex gap-1">
                    {!n.is_read && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markRead.mutate(n.id)}>
                        <Check className="h-3 w-3 mr-1" /> Read
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => dismiss.mutate(n.id)}>
                      <X className="h-3 w-3 mr-1" /> Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
