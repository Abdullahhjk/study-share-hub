import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, RotateCcw, MapPin, FileText, Loader2, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DeletedNote {
  id: string;
  title: string;
  description: string | null;
  is_free: boolean;
  price: number | null;
  school_name: string | null;
  deleted_at: string;
  purged_at: string | null;
  subcategory?: {
    name: string;
    category?: { name: string };
  };
}

interface Props {
  teacherId: string;
}

export function DeletedNotesList({ teacherId }: Props) {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [restoreDialog, setRestoreDialog] = useState<DeletedNote | null>(null);
  const [purgeDialog, setPurgeDialog] = useState<DeletedNote | null>(null);

  const { data: deletedNotes = [], isLoading } = useQuery({
    queryKey: ["deleted-notes", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select(`*, subcategory:subcategories(*, category:categories(*))`)
        .eq("teacher_id", teacherId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as DeletedNote[];
    },
    enabled: !!teacherId,
  });

  const restoreNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("notes")
        .update({ deleted_at: null } as any)
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-notes", teacherId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-notes", teacherId] });
      toast.success("Note restored successfully");
      setRestoreDialog(null);
    },
    onError: () => toast.error("Failed to restore note"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (deletedNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <Trash2 className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">Trash is empty</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleted notes will appear here and be permanently removed after 30 days
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          Notes in trash will be permanently deleted after 30 days.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {deletedNotes.map((note) => {
          const daysLeft = note.deleted_at
            ? Math.max(0, 30 - Math.floor((Date.now() - new Date(note.deleted_at).getTime()) / (1000 * 60 * 60 * 24)))
            : 30;

          return (
            <Card key={note.id} className="overflow-hidden flex flex-col opacity-75 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex flex-col flex-1">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base break-words line-through decoration-1">
                      {note.title}
                    </h4>
                    {note.subcategory && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {note.subcategory.category?.name} → {note.subcategory.name}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {daysLeft}d left
                  </Badge>
                </div>

                {/* DESCRIPTION */}
                {note.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {note.description}
                  </p>
                )}

                {/* SCHOOL */}
                {note.school_name && (
                  <p className="flex items-center text-xs text-muted-foreground mt-2">
                    <MapPin className="h-3 w-3 mr-1 shrink-0" />
                    <span className="break-words">{note.school_name}</span>
                  </p>
                )}

                {/* DELETED TIME */}
                <p className="text-xs text-muted-foreground mt-2">
                  Deleted {formatDistanceToNow(new Date(note.deleted_at), { addSuffix: true })}
                </p>

                {/* SPACER */}
                <div className="flex-1 min-h-2" />

                {/* ACTIONS */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreDialog(note)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPurgeDialog(note)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Now</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Restore Dialog */}
      <Dialog open={!!restoreDialog} onOpenChange={() => setRestoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Note</DialogTitle>
            <DialogDescription>
              Restore "{restoreDialog?.title}" back to your notes?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>Cancel</Button>
            <Button
              onClick={() => restoreDialog && restoreNote.mutate(restoreDialog.id)}
              disabled={restoreNote.isPending}
            >
              {restoreNote.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" />}
              Restore Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Dialog */}
      <Dialog open={!!purgeDialog} onOpenChange={() => setPurgeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Permanently Delete</DialogTitle>
            <DialogDescription>
              This will permanently delete "{purgeDialog?.title}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!purgeDialog) return;
                const { error } = await supabase.from("notes").delete().eq("id", purgeDialog.id);
                if (error) {
                  toast.error("Failed to delete note");
                } else {
                  toast.success("Note permanently deleted");
                  queryClient.invalidateQueries({ queryKey: ["deleted-notes", teacherId] });
                }
                setPurgeDialog(null);
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
