import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  FileText,
  Download,
  Eye,
  Trash2,
  MapPin,
  Pencil,
  Loader2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import type { Note } from "@/lib/types";
import { EditNoteDialog } from "./EditNoteDialog";
import { Input } from "../ui/input";

interface TeacherNotesListProps {
  teacherId: string;
}

export function TeacherNotesList({ teacherId }: TeacherNotesListProps) {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [priceFilter, setPriceFilter] =
    useState<"all" | "free" | "paid">("all");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["teacher-notes", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select(
          `
          *,
          subcategory:subcategories(
            *,
            category:categories(*)
          )
        `
        )
        .eq("teacher_id", teacherId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!teacherId,
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("notes")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-notes", teacherId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-notes", teacherId] });

      toast.success("Note moved to trash. Recoverable for 30 days.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete note");
    },
  });

  const handleEditClick = (note: Note) => {
    setEditingNote(note);
    setEditDialogOpen(true);
  };

  const categories = useMemo(() => {
    const map = new Map();

    notes.forEach((n) => {
      const c = n.subcategory?.category;
      if (c && !map.has(c.id)) map.set(c.id, c);
    });

    return Array.from(map.values());
  }, [notes]);

  const subcategories = useMemo(() => {
    const map = new Map();

    notes.forEach((n) => {
      const s = n.subcategory;
      if (s && !map.has(s.id)) map.set(s.id, s);
    });

    return Array.from(map.values());
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return notes.filter((note) => {
      const matchesSearch =
        !q ||
        note.title?.toLowerCase().includes(q) ||
        note.description?.toLowerCase().includes(q) ||
        note.school_name?.toLowerCase().includes(q) ||
        note.subcategory?.name?.toLowerCase().includes(q) ||
        note.subcategory?.category?.name?.toLowerCase().includes(q);

      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "free" && note.is_free) ||
        (priceFilter === "paid" && !note.is_free);

      const matchesCategory =
        categoryFilter === "all" ||
        note.subcategory?.category?.id === categoryFilter;

      const matchesSubcategory =
        subcategoryFilter === "all" ||
        note.subcategory?.id === subcategoryFilter;

      return (
        matchesSearch && matchesPrice && matchesCategory && matchesSubcategory
      );
    });
  }, [notes, searchQuery, priceFilter, categoryFilter, subcategoryFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-medium">No notes uploaded yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your first note to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* FILTERS */}
      <div className="mb-4 space-y-2">
        <h2 className="text-lg font-medium">Search Notes</h2>

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title..."
        />
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">

        {/* PRICE */}
        <Select
          value={priceFilter}
          onValueChange={(value) =>
            setPriceFilter(value as "all" | "free" | "paid")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Price filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        {/* CATEGORY */}
        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value);
            setSubcategoryFilter("all");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>

            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* SUBCATEGORY */}
        <Select
          value={subcategoryFilter}
          onValueChange={setSubcategoryFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subcategories</SelectItem>

            {subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* GRID */}
      <div className="grid gap-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

        {filteredNotes.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No notes match your filters<br />

              <strong>Search Query:</strong> {searchQuery || "None"}<br />

              <strong>Prices:</strong>{" "}
              {priceFilter.charAt(0).toUpperCase() + priceFilter.slice(1)}<br />
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className="overflow-hidden">
              <CardContent className="p-3 sm:p-4">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base break-words">
                      {note.title}
                    </h4>

                    {note.subcategory && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {note.subcategory.category?.name} → {note.subcategory.name}
                      </p>
                    )}
                  </div>

                  <Badge
                    variant={note.is_free ? "secondary" : "default"}
                    className="self-start text-xs"
                  >
                    {note.is_free ? "Free" : formatPrice(note.price)}
                  </Badge>
                </div>

                {/* DESCRIPTION */}
                {note.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3 sm:line-clamp-2">
                    {note.description}
                  </p>
                )}

                {/* SCHOOL */}
                {note.school_name && (
                  <p className="flex items-center text-xs text-muted-foreground mt-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    {note.school_name}
                  </p>
                )}

                {/* ACTIONS */}
                <div className="mt-4 grid grid-cols-9 gap-1">

                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-3"
                    onClick={() => window.open(note.file_url, "_blank")}
                  >
                    <Eye className="h-3 w-3" />
                    <span className="sm:inline md:hidden lg:inline">View</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-4"
                    asChild
                  >
                    <a href={note.file_url} download>
                      <Download className="h-3 w-3" />
                      <span className="sm:inline md:hidden lg:inline">Download</span>
                    </a>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => handleEditClick(note)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1 text-destructive"
                    onClick={() => {
                      setDeleteNoteId(note.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                </div>

              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* EDIT DIALOG */}
      <EditNoteDialog
        note={editingNote}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        teacherId={teacherId}
      />

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move to Trash "{notes.find(n => n.id === deleteNoteId)?.title}"
            </DialogTitle>
            <DialogDescription>
              This note will be moved to trash and deleted after 30 days.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={deleteNote.isPending}
              onClick={() => {
                if (!deleteNoteId) return;

                deleteNote.mutate(deleteNoteId, {
                  onSettled: () => {
                    setDeleteDialogOpen(false);
                    setDeleteNoteId(null);
                  },
                });
              }}
            >
              {deleteNote.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
              )}
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}