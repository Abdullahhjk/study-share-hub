import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import DOMPurify from "dompurify";
import {
  Sparkles,
  Loader2,
  Rocket,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { VERSION } from "../../../../version";

export interface BuildReport {
  id: string;
  version: string;
  changelog: string;
  subject: string | null;
  html: string | null;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface BuildReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribers: Subscriber[];
  editing?: BuildReport | null;
  onSaved?: () => void;
}

const PREVIEW_DEBOUNCE_MS = 2000;

const jsonExtensions = [json(), EditorView.lineWrapping];
const htmlExtensions = [html(), EditorView.lineWrapping];

export default function BuildReportDialog({
  open,
  onOpenChange,
  subscribers,
  editing,
  onSaved,
}: BuildReportDialogProps) {
  const [tab, setTab] = useState("enhance");
  const [version, setVersion] = useState(VERSION);
  const [changelog, setChangelog] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [debouncedHtml, setDebouncedHtml] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRaw, setAiRaw] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollPosRef = useRef(0);

  const activeSubscribers = subscribers.filter((s) => s.is_active !== false);

  useEffect(() => {
    if (!open) return;
    setAiError(null);
    setAiRaw(null);
    setCorrectionText("");
    setCorrectionError(null);
    scrollPosRef.current = 0;
    if (editing) {
      setVersion(editing.version);
      setChangelog(editing.changelog);
      setSubject(editing.subject ?? "");
      setHtml(editing.html ?? "");
      setDebouncedHtml(editing.html ?? "");
      setTab("preview");
    } else {
      setVersion(VERSION);
      setChangelog("");
      setSubject("");
      setHtml("");
      setDebouncedHtml("");
      setTab("enhance");
    }
  }, [open, editing]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [html]);

  useLayoutEffect(() => {
    const el = previewRefs.current.find((node) => node && node.offsetWidth > 0);
    if (el) el.scrollTop = scrollPosRef.current;
  }, [debouncedHtml]);

  const enhance = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "ai-build-report-email",
        { body: { version, changelog } }
      );
      if (error) throw error;
      return data as {
        subject?: string;
        html?: string;
        error?: string;
        raw?: string;
      };
    },
    onSuccess: (data) => {
      if (data?.error) {
        setAiError(data.error);
        setAiRaw(data.raw ?? "");
        setCorrectionText(data.raw ?? "");
        setTab("enhance");
        return;
      }
      setSubject(data.subject ?? "");
      setHtml(data.html ?? "");
      setDebouncedHtml(data.html ?? "");
      setAiError(null);
      setAiRaw(null);
      setCorrectionError(null);
      setTab("preview");
    },
    onError: (e: Error) => {
      toast.error("Enhancement failed", {
        description: e?.message ?? String(e),
      });
    },
  });

  const handleApplyCorrection = () => {
    try {
      const parsed = JSON.parse(correctionText);
      const correctedSubject =
        typeof parsed.subject === "string" ? parsed.subject : "";
      const correctedHtml =
        typeof parsed.html === "string" ? parsed.html : "";
      if (!correctedSubject || !correctedHtml) {
        throw new Error(
          "Corrected JSON must contain non-empty 'subject' and 'html' strings."
        );
      }
      setSubject(correctedSubject);
      setHtml(correctedHtml);
      setDebouncedHtml(correctedHtml);
      setAiError(null);
      setAiRaw(null);
      setCorrectionError(null);
      setTab("preview");
      toast.success("Correction applied");
    } catch (e) {
      setCorrectionError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDiscardError = () => {
    setAiError(null);
    setAiRaw(null);
    setCorrectionText("");
    setCorrectionError(null);
  };

  const saveReport = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (editing) {
        const { error } = await supabase
          .from("build_reports")
          .update({ version, changelog, subject, html })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("build_reports").insert({
          version,
          changelog,
          subject,
          html,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Report saved");
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Failed to save report", { description: e?.message }),
  });

  const sendReport = useMutation({
    mutationFn: async () => {
      const emails = activeSubscribers.map((s) => s.email);
      if (!emails.length) throw new Error("No active subscribers");
      const { data, error } = await supabase.functions.invoke("send-emails", {
        body: { html, subject, emails },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Send failed");
      const { data: { user } } = await supabase.auth.getUser();
      if (editing) {
        const { error: e2 } = await supabase
          .from("build_reports")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (e2) throw e2;
      } else {
        const { error: e2 } = await supabase.from("build_reports").insert({
          version,
          changelog,
          subject,
          html,
          created_by: user?.id,
          sent_at: new Date().toISOString(),
        });
        if (e2) throw e2;
      }
      return emails.length;
    },
    onSuccess: (count) => {
      toast.success(
        `Sent to ${count} subscriber${count === 1 ? "" : "s"}`
      );
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error("Send failed", { description: e?.message }),
  });

  const enhanceContent = (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <Label>Version</Label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.5"
            />
          </div>
          <div className="space-y-1">
            <Label>Detailed changelog (paste from build-report.txt)</Label>
            <Textarea
              rows={12}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder={"- Added Send Notification modal\n- Fixed cancel request bug\n- ..."}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => enhance.mutate()}
              disabled={enhance.isPending || !changelog.trim() || !version.trim()}
            >
              {enhance.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              {enhance.isPending ? "Enhancing..." : "Enhance with AI"}
            </Button>
            {enhance.isPending && (
              <span className="text-xs text-muted-foreground">
                Cohere command-a-03-2025
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            After enhancing, you will be taken to the Preview tab where you can
            fine-tune the subject and HTML before saving or sending.
          </p>
        </div>

        {aiRaw !== null && (
          <div className="min-w-0 flex-1 space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  Manual correction needed
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDiscardError}>
                Discard
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{aiError}</p>
            <div className="space-y-1">
              <Label className="text-xs">Raw AI output — fix it here</Label>
              <CodeMirror
                height="300px"
                theme="dark"
                value={correctionText}
                onChange={(value) => {
                  setCorrectionText(value ?? "");
                  setCorrectionError(null);
                }}
                extensions={jsonExtensions}
                basicSetup={{ lineNumbers: true, tabSize: 2 }}
              />
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleApplyCorrection}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Apply correction
            </Button>
            {correctionError && (
              <p className="text-xs font-medium text-destructive">
                {correctionError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const codeEditor = (
    <CodeMirror
      height="100%"
      className="h-full"
      theme="dark"
      value={html}
      onChange={(value) => setHtml(value ?? "")}
      extensions={htmlExtensions}
      basicSetup={{ lineNumbers: true, tabSize: 2 }}
    />
  );

  const renderPreviewPane = (index: number) => (
    <div
      ref={(el) => (previewRefs.current[index] = el)}
      onScroll={(e) => {
        scrollPosRef.current = e.currentTarget.scrollTop;
      }}
      className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background p-4"
    >
      <div
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(debouncedHtml) }}
      />
    </div>
  );

  const previewContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b p-6 pb-4">
        <div className="space-y-1">
          <Label>Subject (editable)</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What changed in this build"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:hidden">
          <Tabs defaultValue="code" className="flex h-full flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="code" className="mt-2 min-h-0 flex-1">
              {codeEditor}
            </TabsContent>
            <TabsContent
              value="preview"
              className="mt-2 flex min-h-0 flex-1"
            >
              {renderPreviewPane(0)}
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden flex-1 min-h-0 lg:flex">
          <div
            className="flex min-h-0 flex-1 flex-col px-6 py-4"
            style={{ width: "50%", flexShrink: 0 }}
          >
            <Label className="mb-2">HTML code</Label>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
              {codeEditor}
            </div>
          </div>
          <div className="w-px shrink-0 bg-border" />
          <div
            className="flex min-h-0 flex-1 flex-col px-6 py-4"
            style={{ width: "50%", flexShrink: 0 }}
          >
            <Label className="mb-2">Preview</Label>
            {renderPreviewPane(1)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
        <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b px-6 pt-6 pb-0">
          <DialogHeader className="space-y-1">
            <DialogTitle>
              {editing ? "Edit Build Report" : "New Build Report"}
            </DialogTitle>
            <DialogDescription>
              Build an update email to send to subscribers. All tabs share the
              same report data.
            </DialogDescription>
          </DialogHeader>
          <TabsList className="mt-4 grid w-full grid-cols-2">
            <TabsTrigger value="enhance">AI Enhance</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1">
          <TabsContent value="enhance" className="mt-0 h-full">
            {enhanceContent}
          </TabsContent>
          <TabsContent value="preview" className="mt-0 h-full">
            {previewContent}
          </TabsContent>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-background px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {activeSubscribers.length} active subscriber
              {activeSubscribers.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveReport.isPending || sendReport.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => saveReport.mutate()}
              disabled={
                saveReport.isPending ||
                sendReport.isPending ||
                !subject.trim() ||
                !html.trim()
              }
            >
              {saveReport.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save report
            </Button>
            <Button
              onClick={() => sendReport.mutate()}
              disabled={
                sendReport.isPending ||
                saveReport.isPending ||
                !subject.trim() ||
                !html.trim() ||
                !activeSubscribers.length
              }
            >
              {sendReport.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-1 h-4 w-4" />
              )}
              Send to {activeSubscribers.length} subscribers
            </Button>
          </div>
        </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
