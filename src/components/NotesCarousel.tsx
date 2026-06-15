import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "./NoteCard";
import type { Note } from "@/lib/types";

interface NotesCarouselProps {
  notes: Note[];
  onRequestPaid?: (note: Note) => void;
  onCardClick?: (note: Note) => void;
  onReport?: (note: Note) => void;
}

export function NotesCarousel({ notes, onRequestPaid, onCardClick, onReport }: NotesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
    }
  };

  if (notes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/50">
        <p className="text-sm text-muted-foreground">No notes available in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Button variant="outline" size="icon" className="absolute -left-2 sm:-left-4 top-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 rounded-full bg-card shadow-lg transition-opacity duration-300 opacity-70 sm:opacity-0 sm:group-hover:opacity-75 hover:scale-110 hidden sm:flex" onClick={() => scroll("left")}>
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      <div ref={scrollRef} className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 sm:pb-4 px-1 scrollbar-hide snap-x snap-mandatory touch-pan-x" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} onRequestPaid={onRequestPaid} onCardClick={onCardClick} onReport={onReport} />
        ))}
      </div>
      <Button variant="outline" size="icon" className="absolute -right-2 sm:-right-4 top-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 rounded-full bg-card shadow-lg transition-opacity duration-300 opacity-70 sm:opacity-0 sm:group-hover:opacity-75 hover:scale-110 hidden sm:flex" onClick={() => scroll("right")}>
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  );
}
