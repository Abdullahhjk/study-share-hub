import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Download, ShoppingCart, Calendar, School, User, FileText, Flag } from "lucide-react";
import type { Note } from "@/lib/types";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { proxyImageUrl } from "@/lib/image-proxy";

interface NoteDetailDialogProps {
    note: Note | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRequestPaid?: (note: Note) => void;
    onReport?: (note: Note) => void;
}

export function NoteDetailDialog({ note, open, onOpenChange, onRequestPaid, onReport }: NoteDetailDialogProps) {
    const { formatPrice } = useCurrency();
    if (!note) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
                    <DialogTitle className="text-lg leading-snug">{note.title}</DialogTitle>
                    <DialogDescription>
                        {note.is_free ? "Free resource" : `Premium content — ${formatPrice(note.price)}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {note.preview_image_url && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted shrink-0">
                            <img src={proxyImageUrl(note.preview_image_url) ?? '/placeholder.svg'} alt={note.title} className="h-full w-full object-cover" />
                            <Badge className={`absolute right-2 top-2 ${note.is_free ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}>
                                {note.is_free ? "Free" : formatPrice(note.price)}
                            </Badge>
                        </div>
                    )}

                    {note.description && (
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.description}</p>
                        </div>
                    )}

                    <div className="space-y-2 text-sm">
                        {note.teacher && (
                            <div className="flex items-center gap-2">
                                {note.teacher.avatar_url ? (
                                    <img src={note.teacher.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex flex-col text-xs">
                                    <span className="font-medium">{note.teacher.full_name}</span>
                                    {note.teacher.email && <span className="text-muted-foreground">{note.teacher.email}</span>}
                                </div>
                            </div>
                        )}
                        {note.school_name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <School className="h-4 w-4" /><span>{note.school_name}</span>
                            </div>
                        )}
                        {note.subcategory && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>{note.subcategory.category?.name && `${note.subcategory.category.name} → `}{note.subcategory.name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Uploaded {format(new Date(note.created_at), "MMM d, yyyy")}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 px-6 pb-6 pt-2 shrink-0 border-t">
                    {note.is_free ? (
                        <Button className="flex-1 gap-2" onClick={() => { window.open(note.file_url, "_blank"); onOpenChange(false); }}>
                            <Download className="h-4 w-4" /> Download Free
                        </Button>
                    ) : (
                        <Button variant="secondary" className="flex-1 gap-2" onClick={() => { onRequestPaid?.(note); onOpenChange(false); }}>
                            <ShoppingCart className="h-4 w-4" /> Add to Cart — {formatPrice(note.price)}
                        </Button>
                    )}
                    {onReport && (
                        <Button variant="outline" size="icon" className="shrink-0" onClick={() => { onReport(note); onOpenChange(false); }} title="Report this note">
                            <Flag className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
