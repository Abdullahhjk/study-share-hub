import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Pencil, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import NotificationMarkdown from "@/components/notifications/NotificationMarkdown";

const TEMPLATES: Record<string, { title: string; message: string }> = {
    "Payment Pending": {
        title: "Payment Pending",
        message: "Your payment is still pending. Please verify and complete it at your earliest convenience.",
    },
    "Payment Accepted": {
        title: "Payment Accepted",
        message: "We have received and verified your payment. Thank you!",
    },
    "Payment Not Received": {
        title: "Payment Not Received",
        message: "We have not yet received your payment. Please share a valid receipt or retry the transfer.",
    },
    "Account Blocked": {
        title: "Account Blocked",
        message: "Your account has been blocked due to a policy violation. Contact admin for clarification.",
    },
    "Custom": { title: "", message: "" },
};

const SUB_REASONS = [
    "Fraud suspicion",
    "Chargeback abuse",
    "Fake proof",
    "Spam activity",
    "Manual admin review",
    "Custom",
];

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    recipientId: string | null;
    recipientName?: string;
    recipients?: { id: string; full_name: string; email?: string }[];
    onSent?: (recipientId: string | null) => void;
    editTarget?: { id: string; title: string; message: string; user_id: string | null } | null;
}

export function SendNotificationModal({ open, onOpenChange, recipientId, recipientName, recipients, onSent, editTarget }: Props) {
    const queryClient = useQueryClient();
    const [template, setTemplate] = useState("Payment Pending");
    const [subReason, setSubReason] = useState("Manual admin review");
    const [title, setTitle] = useState(TEMPLATES["Payment Pending"].title);
    const [message, setMessage] = useState(TEMPLATES["Payment Pending"].message);
    const [recipient, setRecipient] = useState<string>(recipientId ?? "all");
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        setRecipient(recipientId ?? "all");
    }, [open, recipientId]);

    useEffect(() => {
        if (TEMPLATES[template]) {
            setTitle(TEMPLATES[template].title);
            setMessage(TEMPLATES[template].message);
        }
    }, [template]);

    useEffect(() => {
        if (!open) return;
        if (editTarget) {
            setTemplate("Custom");
            setTitle(editTarget.title);
            setMessage(editTarget.message);
        } else {
            setTemplate("Payment Pending");
            setTitle(TEMPLATES["Payment Pending"].title);
            setMessage(TEMPLATES["Payment Pending"].message);
        }
    }, [open, editTarget]);

    const enhance = useMutation({
        mutationFn: async () => {
            const id = toast.loading("Generating with AI...", { description: "Calling Cohere command-a-03-2025" });
            try {
                const { data, error } = await supabase.functions.invoke("ai-enhance-notification", {
                    body: { title, message, template, subReason },
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                toast.success("AI enhanced!", { id });
                return data as { title: string; message: string };
            } catch (e) {
                toast.error("AI enhance failed", { id, description: e instanceof Error ? e.message : String(e) });
                throw e;
            }
        },
        onSuccess: (data) => {
            setTitle(data.title);
            setMessage(data.message);
        },
    });

    const send = useMutation({
        mutationFn: async () => {
            if (editTarget) {
                const { error } = await supabase.from("notifications").update({
                    title, message, user_id: recipient === "all" ? null : recipient,
                }).eq("id", editTarget.id);
                if (error) throw error;
                return;
            }
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("notifications").insert({
                title, message, user_id: recipient === "all" ? null : recipient, created_by: user?.id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
            toast.success(editTarget ? "Notification updated" : "Notification sent");
            if (!editTarget) onSent?.(recipient === "all" ? null : recipient);
            onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const selectedName =
        recipientName && recipient !== "all"
            ? recipientName
            : recipient === "all"
                ? "All Users (Broadcast)"
                : recipients?.find(u => u.id === recipient)?.full_name;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {editTarget ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        {editTarget ? "Edit Notification" : "Send Notification"}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedName ? `To: ${selectedName}` : "Select a recipient"}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    {recipients && recipients.length > 0 && (
                        <div className="space-y-1">
                            <Label>Recipient</Label>
                            <Select value={recipient} onValueChange={setRecipient}>
                                <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users (Broadcast)</SelectItem>
                                    {recipients.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name} {u.email ? `(${u.email})` : ""}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label>Template</Label>
                            <Select value={template} onValueChange={setTemplate}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Sub-reason</Label>
                            <Select value={subReason} onValueChange={setSubReason}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SUB_REASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Title</Label>
                        <Input placeholder="Notification title..." value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label>Message</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                                onClick={() => setShowPreview(v => !v)}
                            >
                                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                {showPreview ? "Hide preview" : "Preview"}
                            </Button>
                        </div>
                        <Textarea
                            placeholder="Notification message — Markdown & LaTeX supported, e.g. **bold**, - lists, $E = mc^2$..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={5}
                            className="font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Markdown supported: blank line = new paragraph, **bold**, *italic*, - bullets. LaTeX: $inline$ or $$block$$.
                        </p>
                        {showPreview && (
                            <div className="rounded-md border bg-background p-3">
                                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Preview</p>
                                <p className="text-sm font-medium">{title}</p>
                                <NotificationMarkdown
                                    content={message}
                                    className="mt-1 text-xs text-muted-foreground [&_.katex]:text-[1em]"
                                />
                            </div>
                        )}
                    </div>
                    <Button
                        type="button" variant="secondary" size="sm"
                        onClick={() => enhance.mutate()}
                        disabled={enhance.isPending || (!title.trim() && !message.trim())}
                        className="w-full"
                    >
                        {enhance.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        AI Enhance (Cohere)
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => send.mutate()} disabled={!title.trim() || !message.trim() || send.isPending}>
                        {send.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : editTarget ? <Pencil className="h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                        {editTarget ? "Save" : "Send"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}