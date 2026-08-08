import { Download, ShoppingCart, Flag, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Note } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";
import { proxyImageUrl } from "@/lib/image-proxy";

interface NoteCardProps {
  note: Note;
  onRequestPaid?: (note: Note) => void;
  onCardClick?: (note: Note) => void;
  onReport?: (note: Note) => void;
}

export function NoteCard({ note, onRequestPaid, onCardClick, onReport }: NoteCardProps) {
  const { formatPrice } = useCurrency();
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(note.file_url, "_blank");
  };

  return (
    <Card
      className="group/card flex w-[200px] sm:w-[240px] md:w-[280px] flex-shrink-0 flex-col overflow-hidden transition-all duration-300 hover:shadow-card-hover touch-pan-x snap-start cursor-pointer"
      onClick={() => onCardClick?.(note)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {note.preview_image_url ? (
          <img
            src={proxyImageUrl(note.preview_image_url) ?? '/placeholder.svg'}
            alt={note.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <BookIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary/40" />
          </div>
        )}
        <Badge
          className={`absolute right-2 top-2 text-xs ${note.is_free
            ? "bg-success text-success-foreground"
            : "bg-warning text-warning-foreground"
            }`}
        >
          {note.is_free ? "Free" : formatPrice(note.price)}
        </Badge>
        {onReport && (
          <button
            className="absolute left-2 top-2 rounded-full bg-background/80 p-1.5 opacity-0 transition-opacity group-hover/card:opacity-100 hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onReport(note); }}
            title="Report this note"
          >
            <Flag className="h-3.5 w-3.5 text-destructive" />
          </button>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-1.5 sm:gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 font-display text-sm sm:text-base font-semibold text-foreground">
          {note.title}
        </h3>
        {note.description && (
          <p className="line-clamp-3 text-justify text-xs sm:text-sm text-muted-foreground">
            {note.description}
          </p>
        )}

        <div className="space-y-1 sm:space-y-1 pt-2 border border-muted-foreground p-2 rounded">
          <div className="flex items-center gap-2">
            {note.teacher?.avatar_url ? (
              <img
                src={proxyImageUrl(note.teacher.avatar_url)}
                alt="Profile"
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
                {(note.teacher.full_name || "T").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col text-[10px] sm:text-xs min-w-0">
              {note.teacher && (
                <div className="flex items-center gap-1 min-w-0">
                  <span className="truncate block min-w-0">
                    {note.teacher.full_name}
                  </span>
                  {note.teacher.is_verified && (
                    <BadgeCheck
                      className="h-3.5 w-3.5 shrink-0 text-success"
                      aria-label="Verified teacher"
                    />
                  )}
                </div>
              )}

              {note.teacher?.email && (
                <span className="truncate block max-w-full">
                  {note.teacher.email}
                </span>
              )}

              {note.teacher?.phone && (
                <span className="truncate block max-w-full">
                  {note.teacher.phone}
                </span>
              )}

              {note.school_name && (
                <span className="truncate block max-w-full">
                  {note.school_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 sm:p-4 pt-0">
        {note.is_free ? (
          <Button
            onClick={handleDownload}
            className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Download Free
          </Button>
        ) : (
          <Button
            onClick={(e) => { e.stopPropagation(); onRequestPaid?.(note); }}
            variant="secondary"
            className="w-full gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Add to Cart - {formatPrice(note.price)}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}
