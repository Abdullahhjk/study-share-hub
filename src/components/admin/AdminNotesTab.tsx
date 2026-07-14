import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Loader2,
  Search,
} from "lucide-react";

import type { Note } from "@/lib/types";
import { proxyImageUrl } from "@/lib/image-proxy";

interface NoteWithTeacher extends Note {
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function AdminNotesTab() {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");

  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["admin-all-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select(
          `
          *,
          subcategory:subcategories(
            *,
            category:categories(*)
          ),
          teacher:profiles(
            id,
            full_name,
            email
          )
        `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NoteWithTeacher[];
    },
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
      queryClient.invalidateQueries({ queryKey: ["admin-all-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note moved to trash. Recoverable for 30 days.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete note");
    },
  });

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
        note.teacher?.full_name?.toLowerCase().includes(q) ||
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

      return matchesSearch && matchesPrice && matchesCategory && matchesSubcategory;
    });
  }, [notes, searchQuery, priceFilter, categoryFilter, subcategoryFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {notes.length} total note{notes.length !== 1 ? "s" : ""} on the platform
        </p>
      </div>

      {/* SEARCH */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, school, or teacher..."
            className="pl-9"
          />
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
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
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No notes match your filters
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className="overflow-hidden flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base break-words">
                      {note.title}
                    </h4>

                    {note.subcategory && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {note.subcategory.category?.name} → {note.subcategory.name}
                      </p>
                    )}

                    {note.teacher && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">
                        by {note.teacher.full_name}
                      </p>
                    )}
                  </div>

                  <Badge
                    variant={note.is_free ? "secondary" : "default"}
                    className="shrink-0 text-xs"
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
                    <MapPin className="h-3 w-3 mr-1 shrink-0" />
                    <span className="break-words">{note.school_name}</span>
                  </p>
                )}

                {/* SPACER */}
                <div className="flex-1 min-h-2" />

                {/* ACTIONS */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proxyImageUrl(note.file_url), "_blank")}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={proxyImageUrl(note.file_url)} download>
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
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

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move to Trash "{notes.find((n) => n.id === deleteNoteId)?.title}"
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
