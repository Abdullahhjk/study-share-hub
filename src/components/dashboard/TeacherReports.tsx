import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Flag,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeacherReportsProps {
  teacherId: string;
}

export function TeacherReports({ teacherId }: TeacherReportsProps) {
  const queryClient = useQueryClient();
  const [appealReport, setAppealReport] = useState<any>(null);
  const [appealText, setAppealText] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["teacher-reports", teacherId],
    queryFn: async () => {
      const { data } = await supabase
        .from("note_reports")
        .select("*, notes!inner(title, teacher_id)")
        .eq("notes.teacher_id", teacherId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!teacherId,
  });

  const submitAppeal = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from("note_reports")
        .update({
          appeal_text: text,
          appeal_date: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-reports", teacherId],
      });
      toast.success("Appeal submitted successfully");
      setAppealReport(null);
      setAppealText("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="h-3.5 w-3.5 text-warning" />;
    if (s === "reviewed")
      return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
    return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const statusVariant = (s: string) => {
    if (s === "pending") return "outline";
    if (s === "reviewed") return "default";
    return "secondary";
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Flag className="h-5 w-5" /> Reports on Your Notes
          </CardTitle>
          <CardDescription>
            View reports filed against your notes and submit appeals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reports filed against your notes.{" "}
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {reports.map((r: any) => (
                <div key={r.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {r.notes?.title || "Unknown Note"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(r.status)}
                      <Badge variant={statusVariant(r.status) as any}>
                        {r.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <p>
                      <span className="font-medium">Reason:</span> {r.reason}
                    </p>
                    {r.description && (
                      <p>
                        <span className="font-medium">Details:</span>{" "}
                        {r.description}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>

                  {/* Admin actions visible to teacher */}
                  {r.admin_notes && (
                    <div className="rounded bg-muted/50 p-2 text-xs">
                      <p className="font-medium text-primary">Admin Notes:</p>
                      <p>{r.admin_notes}</p>
                      {r.reviewed_at && (
                        <p className="text-muted-foreground mt-1">
                          Reviewed:{" "}
                          {format(new Date(r.reviewed_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Appeal section */}
                  {r.appeal_text ? (
                    <div className="rounded bg-accent/30 p-2 text-xs">
                      <p className="font-medium">Your Appeal:</p>
                      <p>{r.appeal_text}</p>
                      {r.appeal_date && (
                        <p className="text-muted-foreground mt-1">
                          Submitted:{" "}
                          {format(new Date(r.appeal_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAppealReport(r);
                        setAppealText("");
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Appeal
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appeal Dialog */}
      <Dialog
        open={!!appealReport}
        onOpenChange={(open) => !open && setAppealReport(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Appeal</DialogTitle>
            <DialogDescription>
              Appeal the report on: {appealReport?.notes?.title}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Explain why this report should be reconsidered..."
            value={appealText}
            onChange={(e) => setAppealText(e.target.value)}
            rows={4}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!appealText.trim() || submitAppeal.isPending}
              onClick={() =>
                submitAppeal.mutate({ id: appealReport.id, text: appealText })
              }
            >
              {submitAppeal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-1" />
              )}
              Submit Appeal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
