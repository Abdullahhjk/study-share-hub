import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { SearchFilters } from "@/components/SearchFilters";
import { NotesCarousel } from "@/components/NotesCarousel";
import { RequestPaidNotesDialog } from "@/components/RequestPaidNotesDialog";
import { ReportNoteDialog } from "@/components/ReportNoteDialog";
import {
  useNotes,
  useCategories,
  useSubcategories,
  useTeachers,
  useSchools,
} from "@/hooks/useNotes";
import { BookOpen, SettingsIcon, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Note } from "@/lib/types";
import { NoteDetailDialog } from "@/components/NoteDetailDialog";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/hooks/useCurrency";

const Index = () => {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.substring(1));
  const paramError = params.get('error');
  const paramErrorCode = params.get('error_code');
  const paramDescription = params.get('error_description');

  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [cart, setCart] = useState<Note[]>([]);
  const [cartHidden, setCartHidden] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteDetailOpen, setNoteDetailOpen] = useState(false);
  const [reportNote, setReportNote] = useState<Note | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (paramError) {
      toast({
        title: paramError.replace(/_/g, " ").slice(0, 1).toUpperCase() + paramError.replace(/_/g, " ").slice(1),
        description: paramDescription || paramErrorCode || "An error occurred",
        variant: "destructive",
      });
    }
  }, [paramError, paramErrorCode, paramDescription, toast]);

  const {
    data: notes,
    isLoading: notesLoading,
    isError: notesError,
    error,
    refetch,
  } = useNotes();
  const { data: categories } = useCategories();
  const { data: subcategories } = useSubcategories();
  const { data: teachers = [] } = useTeachers();
  const { data: schools = [] } = useSchools();

  const filteredNotes = useMemo(() => {
    if (!notes) return [];

    return notes.filter((note) => {
      const matchesSearch =
        !searchQuery ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesTeacher =
        !selectedTeacher ||
        selectedTeacher === "all" ||
        note.teacher_id === selectedTeacher;

      const matchesSchool =
        !selectedSchool ||
        selectedSchool === "all" ||
        note.school_name === selectedSchool;

      const deleted = note.deleted_at === null;

      return (
        matchesSearch &&
        matchesTeacher &&
        matchesSchool &&
        deleted
      );
    });
  }, [notes, searchQuery, selectedTeacher, selectedSchool]);

  const notesByCategory = useMemo(() => {
    if (!categories || !subcategories) return {};

    const result: Record<
      string,
      {
        category: (typeof categories)[0];
        subcategories: Record<string, Note[]>;
      }
    > = {};

    categories.forEach((category) => {
      const catSubcategories = subcategories.filter(
        (s) => s.category_id === category.id
      );

      const subcatNotes: Record<string, Note[]> = {};

      catSubcategories.forEach((subcat) => {
        const subNotes = filteredNotes.filter(
          (n) => n.subcategory_id === subcat.id
        );

        if (subNotes.length > 0) {
          subcatNotes[subcat.name] = subNotes;
        }
      });

      if (Object.keys(subcatNotes).length > 0) {
        result[category.id] = {
          category,
          subcategories: subcatNotes,
        };
      }
    });

    return result;
  }, [categories, subcategories, filteredNotes]);

  const handleAddToCart = useCallback(
    (note: Note) => {
      if (note.is_free) {
        window.open(
          note.file_url,
          "_blank",
          "noopener,noreferrer"
        );
        return;
      }

      let warn = false;

      setCart((prev) => {
        if (prev.some((n) => n.id === note.id)) {
          return prev;
        }

        if (
          prev.length > 0 &&
          prev[0].teacher_id !== note.teacher_id
        ) {
          warn = true;
          return prev;
        }

        return [...prev, note];
      });

      setCartHidden(false);

      setTimeout(() => {
        if (warn) {
          toast({
            title: "Different teacher",
            description:
              "You can only request notes from one teacher at a time.",
            variant: "destructive",
          });
        }
      }, 0);
    },
    [toast]
  );

  const handleReport = useCallback((note: Note) => {
    setReportNote(note);
    setReportDialogOpen(true);
  }, []);

  const handleCardClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setNoteDetailOpen(true);
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTeacher("");
    setSelectedSchool("");
  };
  if (notesError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <SettingsIcon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">
            Connection Error
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {!navigator.onLine
              ? "No internet connection detected. Check your network and try again."
              : error instanceof Error
                ? error.message
                : "Failed to load notes. Please try again."}
          </p>

          <Button
            className="mt-6 w-full"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-accent/10 py-8 sm:py-12 md:py-16">
        <div className="container px-4 text-center">
          <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-xl sm:rounded-2xl bg-primary shadow-lg">
            <img
              src="/preview.png"
              alt="Logo"
              className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-lg"
            />
          </div>

          <h1 className="mt-4 sm:mt-6 font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Scholar Share — Share notes. Build mastery.
          </h1>

          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground px-4">
            Browse study materials from verified teachers.
            Download free notes instantly or request access to
            premium content.
          </p>
        </div>
      </section>

      <section className="border-b bg-card py-4 sm:py-6">
        <div className="container px-4 space-y-3">
          <SearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            teachers={teachers}
            schools={schools}
            selectedTeacher={selectedTeacher}
            selectedSchool={selectedSchool}
            onTeacherChange={setSelectedTeacher}
            onSchoolChange={setSelectedSchool}
            onClearFilters={clearFilters}
          />
        </div>
      </section>

      <main className="container px-4 py-6 sm:py-8">
        {notesLoading ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
            <div className="h-12 w-12 sm:h-16 sm:w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <h2 className="mt-4 text-lg sm:text-xl font-semibold">Loading notes...</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">Please wait while we fetch the latest notes.</p>
          </div>
        ) : Object.keys(notesByCategory).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" />

            <h2 className="mt-4 text-lg sm:text-xl font-semibold">
              No notes found
            </h2>

            <p className="mt-2 text-sm sm:text-base text-muted-foreground px-4">
              {searchQuery ||
                selectedTeacher ||
                selectedSchool
                ? (
                  <>
                    <p>Try adjusting your filters.</p>
                    {searchQuery && <p>Search Query: '{searchQuery}'</p>}
                    {selectedTeacher && <p>Selected Teacher: '{teachers.find((t) => t.id === selectedTeacher)?.full_name || "Unknown Teacher"}'</p>}
                    {selectedSchool && <p>Selected School: '{selectedSchool}'</p>}
                  </>
                )
                : "Notes will appear here once teachers upload them."}
            </p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {Object.entries(notesByCategory).map(
              ([categoryId, { category, subcategories: subcats }]) => (
                <section
                  key={categoryId}
                  className="animate-fade-in"
                >
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {category.name}
                  </h2>

                  <div className="mt-4 sm:mt-6 space-y-6 sm:space-y-8">
                    {Object.entries(subcats).map(
                      ([subcatName, subNotes]) => (
                        <div key={subcatName}>
                          <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-muted-foreground">
                            {subcatName}
                          </h3>

                          <NotesCarousel
                            notes={subNotes}
                            onRequestPaid={handleAddToCart}
                            onCardClick={handleCardClick}
                            onReport={handleReport}
                          />
                        </div>
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </main>

      {!cartHidden ? (
        <div className="fixed bottom-14 left-4 z-50 flex flex-col items-end gap-2">
          <Card className="w-72 shadow-lg border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Cart ({cart.length} items)
                </span>

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setCartHidden(true);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto">
                {cart.length > 0 ? (
                  cart.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate flex-1">
                        {note.title}
                      </span>

                      <span className="ml-2">
                        {formatPrice(note.price)}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-1"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((n) => n.id !== note.id)
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    No items added yet!
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t flex items-center justify-between">
                <span className="font-medium">
                  Total:{" "}
                  {formatPrice(cart.reduce(
                    (s, n) => s + Number(n.price ?? 0),
                    0
                  ))}
                </span>

                <Button
                  size="sm"
                  onClick={() =>
                    cart.length > 0 &&
                    setRequestDialogOpen(true)
                  }
                  className={`${cart.length > 0
                    ? "bg-primary text-foreground"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Button
          onClick={() => setCartHidden(false)}
          className="fixed bottom-12 left-5 z-50 h-14 w-14 rounded-full shadow-xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart className="h-6 w-6" />

            {cart.length > 0 && (
              <span className="absolute -top-5 -right-5 min-w-[20px] h-5 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-white">
                {cart.length > 9 ? "9+" : cart.length}
              </span>
            )}
          </div>
        </Button>
      )}

      <RequestPaidNotesDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        selectedNotes={cart}
        onSuccess={() => setCart([])}
      />

      <NoteDetailDialog
        note={selectedNote}
        open={noteDetailOpen}
        onOpenChange={setNoteDetailOpen}
        onRequestPaid={handleAddToCart}
        onReport={handleReport}
      />

      <ReportNoteDialog
        noteId={reportNote?.id || null}
        noteTitle={reportNote?.title || ""}
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />

      <Footer />
    </div>
  );
};

export default Index;