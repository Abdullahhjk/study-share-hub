import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

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
}

export function SendNotificationModal({ open, onOpenChange, recipientId, recipientName }: Props) {
    const [template, setTemplate] = useState("Payment Pending");
    const [subReason, setSubReason] = useState("Manual admin review");
    const [title, setTitle] = useState(TEMPLATES["Payment Pending"].title);
    const [message, setMessage] = useState(TEMPLATES["Payment Pending"].message);

    useEffect(() => {
        if (TEMPLATES[template]) {
            setTitle(TEMPLATES[template].title);
            setMessage(TEMPLATES[template].message);
        }
    }, [template]);

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
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("notifications").insert({
                title, message, user_id: recipientId, created_by: user?.id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Notification sent");
            onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message),
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send Notification</DialogTitle>
                    <DialogDescription>
                        {recipientName ? `To: ${recipientName}` : "Targeted notification"}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
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
                        <Label>Message</Label>
                        <Textarea placeholder="Notification message..." value={message} onChange={e => setMessage(e.target.value)} rows={5} />
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
                        {send.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : <Send className="h-4 w-4 mr-1" />}
                        Send
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}