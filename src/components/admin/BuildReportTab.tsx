import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DOMPurify from "dompurify";
import { Sparkles, Trash2, Mail, Copy, Send, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VERSION } from "../../../version";

export default function BuildReportTab() {
    const qc = useQueryClient();
    const [version, setVersion] = useState(VERSION);
    const [changelog, setChangelog] = useState("");
    const [subject, setSubject] = useState("");
    const [html, setHtml] = useState("");

    const { data: subscribers = [] } = useQuery({
        queryKey: ["newsletter-subscribers"],
        queryFn: async () => {
            const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
            return data || [];
        },
    });

    const generate = useMutation({
        mutationFn: async () => {
            const tid = toast.loading("Generating with AI...", { description: "Cohere command-a-03-2025" });
            try {
                const { data, error } = await supabase.functions.invoke("ai-build-report-email", {
                    body: { version, changelog },
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                toast.success("Email generated!", { id: tid });
                return data as { subject: string; html: string };
            } catch (e) {
                toast.error("Generation failed", { id: tid, description: e instanceof Error ? e.message : String(e) });
                throw e;
            }
        },
        onSuccess: (data) => { setSubject(data.subject); setHtml(data.html); },
    });

    const saveReport = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("build_reports").insert({
                version, changelog, subject, html, created_by: user?.id,
            });
            if (error) throw error;
        },
        onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["build-reports"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const removeSubscriber = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] }); },
    });

    const ACTIVEPIECES_WEBHOOK = import.meta.env.VITE_ACTIVEPIECES_WEBHOOK || "";

    const sendViaActivepieces = useMutation({
        mutationFn: async () => {
            if (!subject || !html) throw new Error("Generate subject + HTML first");
            const emails = (subscribers as any[]).filter(s => s.is_active !== false).map(s => s.email);
            if (!emails.length) throw new Error("No active subscribers");
            const res = await fetch(ACTIVEPIECES_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ html, subject, emails }),
            });
            if (!res.ok) throw new Error(`Webhook failed: ${res.status} ${await res.text()}`);
            // Save report and mark sent
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("build_reports").insert({
                version, changelog, subject, html, created_by: user?.id, sent_at: new Date().toISOString(),
            });
            return emails.length;
        },
        onSuccess: (count) => {
            toast.success(`Sent to ${count} subscriber${count === 1 ? "" : "s"}`);
            qc.invalidateQueries({ queryKey: ["build-reports"] });
        },
        onError: (e: any) => toast.error("Send failed", { description: e.message }),
    });

    const mailtoAll = () => {
        if (!subscribers.length || !subject) return;
        const bcc = subscribers.map((s: any) => s.email).join(",");
        const body = "View this email as HTML in your browser. Plain-text fallback:\n\n" + changelog;
        window.location.href = `mailto:?to=${encodeURIComponent("noreply.webgradezapp@gmail.com")}&bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const copyHtml = async () => {
        await navigator.clipboard.writeText(html);
        toast.success("HTML copied");
    };

    return (
        <div className="space-y-6 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Build Report</CardTitle>
                    <CardDescription>Compose an update email to send to subscribers. AI generates subject + HTML.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                        <div className="space-y-1">
                            <Label>Version</Label>
                            <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.0.5" />
                        </div>
                        <div className="space-y-1">
                            <Label>Subject (editable)</Label>
                            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What changed in this build" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Detailed changelog (paste from build-report.txt)</Label>
                        <Textarea rows={6} value={changelog} onChange={e => setChangelog(e.target.value)}
                            placeholder="- Added Send Notification modal&#10;- Fixed cancel request bug&#10;- ..." />
                    </div>
                    <Button onClick={() => generate.mutate()} disabled={generate.isPending || !changelog.trim() || !version.trim()}>
                        {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        Generate email with AI
                    </Button>
                </CardContent>
            </Card>

            {html && (
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>Edit HTML directly. Send manually using the actions below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Textarea rows={10} value={html} onChange={e => setHtml(e.target.value)} className="font-mono text-xs" />
                        <div className="rounded-md border bg-background p-4">
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={copyHtml}><Copy className="h-4 w-4 mr-1" /> Copy HTML</Button>
                            <Button variant="outline" onClick={mailtoAll} disabled={!subscribers.length}>
                                <Send className="h-4 w-4 mr-1" /> Open mail client (BCC {subscribers.length})
                            </Button>
                            <Button
                                variant="default"
                                onClick={() => sendViaActivepieces.mutate()}
                                disabled={sendViaActivepieces.isPending || !subscribers.length || !html || !subject}
                            >
                                {sendViaActivepieces.isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" />
                                    : <Rocket className="h-4 w-4 mr-1" />}
                                Send via ActivePieces ({(subscribers as any[]).filter(s => s.is_active !== false).length})
                            </Button>
                            <Button onClick={() => saveReport.mutate()} disabled={saveReport.isPending}>
                                {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1 inline-block" /> : null}
                                Save report
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Subscribers <Badge variant="secondary">{subscribers.length}</Badge></CardTitle>
                </CardHeader>
                <CardContent>
                    {subscribers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No subscribers yet.</p>
                    ) : (
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                            {subscribers.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                    <span>{s.email}</span>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                        onClick={() => removeSubscriber.mutate(s.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}