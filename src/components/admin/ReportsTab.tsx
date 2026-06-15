import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Flag,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function ReportsTab() {
  const queryClient = useQueryClient();
  const [reviewReport, setReviewReport] = useState<any>(null);
  const [editReport, setEditReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [deleteReport, setDeleteReport] = useState<any>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("note_reports")
        .select(
          "*, notes(title, teacher_id, profiles:teacher_id(full_name, email))",
        )
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from("note_reports")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report updated");
      setReviewReport(null);
      setEditReport(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("note_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report deleted");
      setDeleteReport(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (s: string) => {
    if (s === "pending") return "outline";
    if (s === "reviewed") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" /> Reported Notes
          </CardTitle>
          <CardDescription>
            Review flagged notes, edit details, and respond to appeals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reports yet.
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
                      <p className="text-xs text-muted-foreground">
                        By: {r.notes?.profiles?.full_name || "Unknown"} •{" "}
                        {r.notes?.profiles?.email || ""}
                      </p>
                    </div>
                    <Badge variant={statusColor(r.status) as any}>
                      {r.status}
                    </Badge>
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
                    {r.reporter_email && (
                      <p>
                        <span className="font-medium">Reporter:</span>{" "}
                        {r.reporter_email}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                    {r.admin_notes && (
                      <p className="text-primary">
                        <span className="font-medium">Admin notes:</span>{" "}
                        {r.admin_notes}
                      </p>
                    )}
                  </div>

                  {/* Teacher appeal */}
                  {r.appeal_text && (
                    <div className="rounded bg-accent/30 p-2 text-xs">
                      <p className="font-medium">⚖️ Teacher Appeal:</p>
                      <p>{r.appeal_text}</p>
                      {r.appeal_date && (
                        <p className="text-muted-foreground mt-1">
                          Submitted:{" "}
                          {format(new Date(r.appeal_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewReport(r);
                            setAdminNotes("");
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateReport.mutate({
                              id: r.id,
                              updates: { status: "dismissed", admin_notes: "" },
                            })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditReport(r);
                        setEditReason(r.reason);
                        setEditDescription(r.description || "");
                        setEditAdminNotes(r.admin_notes || "");
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteReport(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewReport}
        onOpenChange={(open) => !open && setReviewReport(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Note: {reviewReport?.notes?.title} — Reason:{" "}
              {reviewReport?.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Admin Notes</Label>
              <Textarea
                placeholder="Add investigation notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() =>
                updateReport.mutate({
                  id: reviewReport.id,
                  updates: {
                    status: "reviewed",
                    admin_notes: adminNotes,
                    reviewed_at: new Date().toISOString(),
                  },
                })
              }
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Mark Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editReport}
        onOpenChange={(open) => !open && setEditReport(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
            <DialogDescription>
              Modify report details for: {editReport?.notes?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Admin Notes</Label>
              <Textarea
                value={editAdminNotes}
                onChange={(e) => setEditAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() =>
                updateReport.mutate({
                  id: editReport.id,
                  updates: {
                    reason: editReason,
                    description: editDescription || null,
                    admin_notes: editAdminNotes || null,
                  },
                })
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteReport}
        onOpenChange={(open) => !open && setDeleteReport(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this report? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => removeReport.mutate(deleteReport.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
