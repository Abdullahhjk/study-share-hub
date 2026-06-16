import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EditorView } from "@codemirror/view";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket,
  Sparkles,
  Trophy,
  MessageSquare,
  Globe,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  X,
  GripVertical,
  Clock,
  Loader2,
  BookOpen,
  Users,
  Shield,
  Zap,
  Star,
  Settings,
  Heart,
  Flag,
  Award,
  Lightbulb,
  Target,
  Share2,
  Lock,
  Eye,
  Palette,
  Gift,
  Layers,
  Code,
  Database,
  Cloud,
  Link,
  Compass,
  GraduationCap,
  Search,
  RefreshCw,
  CheckCircle,
  Mail,
  Calendar,
  Monitor,
  Smartphone,
  Download as DownloadIcon,
  FileText,
  BarChart,
  TrendingUp,
  UserPlus,
  BookMarked,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, typeof Rocket> = {
  Rocket, Sparkles, Trophy, MessageSquare, Globe, Bell, Clock,
  BookOpen, Users, Shield, Zap, Star, Settings, Heart, Flag,
  Award, Lightbulb, Target, Share2, Lock, Eye, Palette, Gift,
  Layers, Code, Database, Cloud, Link, Compass, GraduationCap,
  Search, RefreshCw, CheckCircle, Mail, Calendar, Monitor,
  Smartphone, Download: DownloadIcon, FileText, BarChart, TrendingUp, UserPlus, BookMarked,
};

const ICON_NAMES = Object.keys(ICON_MAP);

interface ContentBlock {
  type: "text" | "list" | "table";
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

interface DbFeature {
  id: string;
  title: string;
  description: ContentBlock[];
  category: string;
  icon_name: string;
  target_date: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FeatureForm {
  title: string;
  category: string;
  icon_name: string;
  target_date: string;
  status: string;
  description: ContentBlock[];
}

const defaultForm: FeatureForm = {
  title: "",
  category: "General",
  icon_name: "Rocket",
  target_date: "",
  status: "planned",
  description: [{ type: "text", content: "" }],
};

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in-development", label: "In Development" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
  { value: "deployed", label: "Deployed" },
];

function renderDescriptionPreview(block: ContentBlock, bi: number) {
  if (block.type === "text") {
    return <p key={bi}>{block.content}</p>;
  }
  if (block.type === "list" && block.items) {
    return (
      <ul key={bi} className="list-disc pl-4 space-y-0.5">
        {block.items.map((item, ii) => (
          <li key={ii}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "table" && block.headers && block.rows && block.headers.length > 0) {
    return (
      <div key={bi} className="overflow-x-auto rounded border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {block.headers.map((header, hi) => (
                <th key={hi} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.slice(0, 3).map((row, ri) => (
              <tr key={ri} className="border-b last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1">{cell}</td>
                ))}
              </tr>
            ))}
            {block.rows.length > 3 && (
              <tr>
                <td colSpan={block.headers.length} className="px-2 py-1 text-muted-foreground italic">
                  ... {block.rows.length - 3} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function UpcomingFeaturesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureForm>({ ...defaultForm });
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [importJson, setImportJson] = useState("");
  const syncingRef = useRef(false);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["upcoming_features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upcoming_features")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbFeature[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (vals: { id?: string; data: FeatureForm }) => {
      const payload = {
        title: vals.data.title,
        description: vals.data.description,
        category: vals.data.category,
        icon_name: vals.data.icon_name,
        target_date: vals.data.target_date || null,
        status: vals.data.status,
      };
      if (vals.id) {
        const { error } = await supabase
          .from("upcoming_features")
          .update(payload)
          .eq("id", vals.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("upcoming_features")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming_features"] });
      closeForm();
      toast({ title: editingId ? "Feature updated" : "Feature added" });
    },
    onError: (err: any) =>
      toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("upcoming_features").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming_features"] });
      toast({ title: "Feature deleted" });
    },
    onError: (err: any) =>
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async (records: FeatureForm[]) => {
      const payload = records.map((r) => ({
        title: r.title,
        description: r.description,
        category: r.category || "General",
        icon_name: r.icon_name || "Rocket",
        target_date: r.target_date || null,
        status: r.status || "planned",
      }));
      const { error } = await supabase.from("upcoming_features").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming_features"] });
      setImportOpen(false);
      setImportJson("");
      toast({ title: `Imported successfully` });
    },
    onError: (err: any) =>
      toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const enhanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-enhance-notification", {
        body: {
          featureJson: JSON.parse(jsonText),
          customInstructions: customInstructions || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const enhanced = JSON.stringify(data, null, 2);
      setJsonText(enhanced);
      try {
        const parsed = JSON.parse(enhanced);
        syncingRef.current = true;
        setForm(parsed);
        setJsonError(null);
        setTimeout(() => { syncingRef.current = false; }, 0);
      } catch { /* ignore */ }
      toast({ title: "Feature enhanced with AI" });
    },
    onError: (err: any) =>
      toast({ title: "Enhancement failed", description: err.message, variant: "destructive" }),
  });

  function initForm(next: FeatureForm) {
    setForm(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(null);
  }

  function setFormAndSync(updater: FeatureForm | ((prev: FeatureForm) => FeatureForm)) {
    if (syncingRef.current) return;
    const next = typeof updater === "function" ? updater(form) : updater;
    setForm(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(null);
  }

  function handleJsonChange(value: string) {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      syncingRef.current = true;
      setForm(parsed);
      setJsonError(null);
      setTimeout(() => { syncingRef.current = false; }, 0);
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    initForm({ ...defaultForm });
  }

  function openAdd() {
    setEditingId(null);
    initForm({ ...defaultForm });
    setFormOpen(true);
  }

  function openEdit(f: DbFeature) {
    setEditingId(f.id);
    initForm({
      title: f.title,
      category: f.category,
      icon_name: f.icon_name,
      target_date: f.target_date ?? "",
      status: f.status,
      description: f.description.length ? f.description : [{ type: "text", content: "" }],
    });
    setFormOpen(true);
  }

  function handleExport() {
    const json = JSON.stringify(features, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      toast({ title: "JSON copied to clipboard" });
    });
  }

  function addBlock() {
    setFormAndSync((f) => ({
      ...f,
      description: [...f.description, { type: "text" as const, content: "" }],
    }));
  }

  function removeBlock(idx: number) {
    setFormAndSync((f) => ({
      ...f,
      description: f.description.filter((_, i) => i !== idx),
    }));
  }

  function updateBlock(idx: number, block: ContentBlock) {
    setFormAndSync((f) => {
      const next = [...f.description];
      next[idx] = block;
      return { ...f, description: next };
    });
  }

  function addListItem(blockIdx: number) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      block.type = "list";
      block.items = [...(block.items ?? []), ""];
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function updateListItem(blockIdx: number, itemIdx: number, value: string) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      const items = [...(block.items ?? [])];
      items[itemIdx] = value;
      block.items = items;
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function removeListItem(blockIdx: number, itemIdx: number) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      block.items = (block.items ?? []).filter((_, i) => i !== itemIdx);
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function addTableRow(blockIdx: number) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      const emptyRow = (block.headers ?? []).map(() => "");
      block.rows = [...(block.rows ?? []), emptyRow];
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function removeTableRow(blockIdx: number, rowIdx: number) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      block.rows = (block.rows ?? []).filter((_, i) => i !== rowIdx);
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function updateTableCell(blockIdx: number, rowIdx: number, colIdx: number, value: string) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      const rows = [...(block.rows ?? [])];
      const row = [...(rows[rowIdx] ?? [])];
      row[colIdx] = value;
      rows[rowIdx] = row;
      block.rows = rows;
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function updateTableHeader(blockIdx: number, colIdx: number, value: string) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      const headers = [...(block.headers ?? [])];
      headers[colIdx] = value;
      block.headers = headers;
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function addTableColumn(blockIdx: number) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      const newHeaders = [...(block.headers ?? []), ""];
      const newRows = (block.rows ?? []).map((row) => [...row, ""]);
      block.headers = newHeaders;
      block.rows = newRows;
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function removeTableColumn(blockIdx: number, colIdx: number) {
    setFormAndSync((f) => {
      const next = [...f.description];
      const block = { ...next[blockIdx] };
      block.headers = (block.headers ?? []).filter((_, i) => i !== colIdx);
      block.rows = (block.rows ?? []).map((row) => row.filter((_, i) => i !== colIdx));
      next[blockIdx] = block;
      return { ...f, description: next };
    });
  }

  function formFields() {
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setFormAndSync((f) => ({ ...f, title: e.target.value }))}
            placeholder="Feature title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => setFormAndSync((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Teachers, General"
            />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <Select
              value={form.icon_name}
              onValueChange={(v) => setFormAndSync((f) => ({ ...f, icon_name: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_NAMES.map((name) => {
                  const I = ICON_MAP[name];
                  return (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        <I className="h-3.5 w-3.5" />
                        {name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Target Date</Label>
            <Input
              type="date"
              value={form.target_date}
              onChange={(e) => setFormAndSync((f) => ({ ...f, target_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setFormAndSync((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description blocks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Description Content</Label>
            <Button type="button" variant="outline" size="sm" onClick={addBlock} className="gap-1 text-xs h-7">
              <Plus className="h-3 w-3" />
              Add Block
            </Button>
          </div>

          {form.description.map((block, bi) => (
            <div key={bi} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Select
                  value={block.type}
                  onValueChange={(v) => updateBlock(bi, { ...block, type: v as ContentBlock["type"] })}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Paragraph</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBlock(bi)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {block.type === "text" && (
                <Textarea
                  value={block.content ?? ""}
                  onChange={(e) => updateBlock(bi, { ...block, content: e.target.value })}
                  placeholder="Write a paragraph..."
                  className="min-h-[60px] text-xs"
                />
              )}

              {block.type === "list" && (
                <div className="space-y-1.5">
                  {(block.items ?? [""]).map((item, ii) => (
                    <div key={ii} className="flex items-center gap-1">
                      <span className="text-muted-foreground text-xs">•</span>
                      <Input
                        value={item}
                        onChange={(e) => updateListItem(bi, ii, e.target.value)}
                        placeholder="List item"
                        className="h-7 text-xs"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeListItem(bi, ii)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => addListItem(bi)}>
                    <Plus className="h-3 w-3" />
                    Add item
                  </Button>
                </div>
              )}

              {block.type === "table" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {(block.headers ?? [""]).map((header, hi) => (
                      <div key={hi} className="flex items-center gap-1 flex-1 min-w-[100px]">
                        <Input
                          value={header}
                          onChange={(e) => updateTableHeader(bi, hi, e.target.value)}
                          placeholder={`Column ${hi + 1}`}
                          className="h-7 text-xs flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                          onClick={() => removeTableColumn(bi, hi)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => addTableColumn(bi)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {(block.rows ?? []).map((row, ri) => (
                    <div key={ri} className="flex items-center gap-1">
                      {row.map((cell, ci) => (
                        <Input
                          key={ci}
                          value={cell}
                          onChange={(e) => updateTableCell(bi, ri, ci, e.target.value)}
                          placeholder="..."
                          className="h-7 text-xs flex-1 min-w-[100px]"
                        />
                      ))}
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                        onClick={() => removeTableRow(bi, ri)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => addTableRow(bi)}>
                      <Plus className="h-3 w-3" />
                      Add row
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function jsonEditor() {
    return (
      <div className="space-y-2 py-2">
        <Label>JSON Editor</Label>
        <CodeMirror
          height="400px"
          theme="dark"
          value={jsonText}
          onChange={(value) => handleJsonChange(value ?? "")}
          extensions={[json(), EditorView.lineWrapping]}
          basicSetup={{
            lineNumbers: true,
            tabSize: 2,
          }}
        />
        {jsonError && (
          <p className="text-xs text-destructive font-medium mt-1">{jsonError}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Edit the JSON directly. Valid JSON is automatically synced to the form.
        </p>
        <div className="flex items-start gap-2 mt-2">
          <Input
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Custom instructions for AI (optional)"
            className="h-8 text-xs flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => enhanceMutation.mutate()}
            disabled={!!jsonError || enhanceMutation.isPending}
            className="gap-1.5 shrink-0"
          >
            {enhanceMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {enhanceMutation.isPending ? "Enhancing..." : "Enhance with Cohere"}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Upcoming Features</h2>
          <p className="text-sm text-muted-foreground">{features.length} feature{features.length !== 1 ? "s" : ""} listed</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Import JSON
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Feature
          </Button>
        </div>
      </div>

      {/* Feature cards */}
      {features.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Rocket className="mb-2 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No upcoming features yet</p>
          <Button variant="link" onClick={openAdd}>
            Add your first feature
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {features.map((f) => {
            const IconComp = ICON_MAP[f.icon_name] || Rocket;
            return (
              <Card key={f.id} className="border-border/60">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-primary/5 rounded-lg shrink-0 mt-0.5">
                      <IconComp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{statusOptions.find((s) => s.value === f.status)?.label}</Badge>
                        {f.target_date && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(f.target_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete feature?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove "{f.title}". This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(f.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                {f.description.length > 0 && (
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {f.description.map((block, bi) => renderDescriptionPreview(block, bi))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog with side-by-side form + JSON editor */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Feature" : "Add Feature"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the feature details below." : "Fill in the details for the new feature."}
            </DialogDescription>
          </DialogHeader>

          {/* Mobile/tablet: tabs */}
          <div className="lg:hidden">
            <Tabs defaultValue="form">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="json">JSON Editor</TabsTrigger>
              </TabsList>
              <TabsContent value="form">
                {formFields()}
              </TabsContent>
              <TabsContent value="json">
                {jsonEditor()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: side by side */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
            <div>
              {formFields()}
            </div>
            <div className="border-l pl-6">
              {jsonEditor()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={() => upsertMutation.mutate({ id: editingId ?? undefined, data: form })}
              disabled={upsertMutation.isPending || !form.title.trim()}
            >
              {upsertMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Features from JSON</DialogTitle>
            <DialogDescription>
              Paste a JSON array of features. Each object needs a "title" field. Other fields (category, icon_name, target_date, status, description) are optional.
            </DialogDescription>
          </DialogHeader>

          <CodeMirror
            height="250px"
            className="rounded-md border border-border"
            theme="dark"
            value={importJson}
            onChange={(value) => setImportJson(value ?? "")}
            extensions={[json()]}
            basicSetup={{
              lineNumbers: true,
              tabSize: 2,
            }}
          />

          {importJson.trim() && (
            <p className="text-xs text-muted-foreground">
              {(() => {
                try { return `Found ${JSON.parse(importJson).length} feature(s)`; }
                catch { return "Invalid JSON"; }
              })()}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                try {
                  const parsed = JSON.parse(importJson);
                  if (!Array.isArray(parsed)) throw new Error("Must be an array");
                  importMutation.mutate(parsed);
                } catch (err: any) {
                  toast({ title: "Invalid JSON", description: err.message, variant: "destructive" });
                }
              }}
              disabled={importMutation.isPending || !importJson.trim()}
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
