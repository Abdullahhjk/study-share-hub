import { useState } from "react";

import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportNoteDialogProps {
  noteId: string | null;
  noteTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportNoteDialog({ noteId, noteTitle, open, onOpenChange }: ReportNoteDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !noteId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("note_reports" as any).insert({
        note_id: noteId,
        reason,
        description: description || null,
        reporter_email: email || null,
      } as any);
      if (error) throw error;
      toast.success("Report submitted. An admin will review it.");
      onOpenChange(false);
      setReason(""); setDescription(""); setEmail("");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" /> Report Note
          </DialogTitle>
          <DialogDescription>
            Report "<strong>{noteTitle}</strong>" for admin investigation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="copyright">Copyright Violation</SelectItem>
                <SelectItem value="spam">Spam / Misleading</SelectItem>
                <SelectItem value="wrong_content">Wrong / Inaccurate Content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Details (optional)</Label>
            <Textarea placeholder="Describe the issue..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Your Email (optional)</Label>
            <Input type="email" placeholder="For follow-up" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={handleSubmit} disabled={!reason || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : <Flag className="h-4 w-4 mr-1" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
