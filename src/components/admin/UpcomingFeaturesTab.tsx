import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DbFeature,
  FeatureForm,
  ContentBlock,
  defaultForm,
  validateFeatureJson,
  mergeWithDefaults,
} from "./upcoming-features/types";
import FeatureCards from "./upcoming-features/FeatureCards";
import FeatureFormDialog from "./upcoming-features/FeatureFormDialog";
import TableEditDialog from "./upcoming-features/TableEditDialog";
import ImportDialog from "./upcoming-features/ImportDialog";

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
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableDialogBlockIdx, setTableDialogBlockIdx] = useState<number | null>(null);
  const [tableDialogHeaders, setTableDialogHeaders] = useState<string[]>([""]);
  const [tableDialogRows, setTableDialogRows] = useState<string[][]>([[""]]);

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
          .update(payload as any)
          .eq("id", vals.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("upcoming_features")
          .insert(payload as any);
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
    mutationFn: async (records: Record<string, unknown>[]) => {
      const payload = records.map((r) => {
        const safe = mergeWithDefaults(r);
        return {
          title: safe.title,
          description: safe.description,
          category: safe.category,
          icon_name: safe.icon_name,
          target_date: safe.target_date || null,
          status: safe.status,
        };
      });
      const { error } = await supabase.from("upcoming_features").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming_features"] });
      setImportOpen(false);
      setImportJson("");
      toast({ title: "Imported successfully" });
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
        const errors = validateFeatureJson(parsed);
        if (errors.length > 0) {
          setJsonError(errors.join("\n"));
          return;
        }
        syncingRef.current = true;
        setForm(mergeWithDefaults(parsed));
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
      const errors = validateFeatureJson(parsed);
      if (errors.length > 0) {
        setJsonError(errors.join("\n"));
        return;
      }
      syncingRef.current = true;
      setForm(mergeWithDefaults(parsed));
      setJsonError(null);
      setTimeout(() => { syncingRef.current = false; }, 0);
    } catch {
      setJsonError("Invalid JSON syntax. Check for missing commas, quotes, or brackets.");
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

  function openTableDialog(blockIdx: number) {
    const block = form.description[blockIdx];
    setTableDialogBlockIdx(blockIdx);
    setTableDialogHeaders([...(block.headers ?? [""])]);
    setTableDialogRows((block.rows ?? [""]).map((r) => [...r]));
    setTableDialogOpen(true);
  }

  function saveTableDialog() {
    if (tableDialogBlockIdx === null) return;
    updateBlock(tableDialogBlockIdx, {
      type: "table",
      headers: tableDialogHeaders,
      rows: tableDialogRows,
    });
    setTableDialogOpen(false);
    setTableDialogBlockIdx(null);
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

      <FeatureCards features={features} openEdit={openEdit} deleteMutation={deleteMutation} />

      <FeatureFormDialog
        open={formOpen}
        onClose={closeForm}
        editingId={editingId}
        form={form}
        jsonText={jsonText}
        jsonError={jsonError}
        customInstructions={customInstructions}
        setCustomInstructions={setCustomInstructions}
        handleJsonChange={handleJsonChange}
        enhanceMutation={enhanceMutation}
        upsertMutation={upsertMutation}
        setFormAndSync={setFormAndSync}
        addBlock={addBlock}
        removeBlock={removeBlock}
        updateBlock={updateBlock}
        addListItem={addListItem}
        updateListItem={updateListItem}
        removeListItem={removeListItem}
        openTableDialog={openTableDialog}
      />

      <TableEditDialog
        open={tableDialogOpen}
        onOpenChange={(open) => { if (!open) setTableDialogOpen(false); }}
        headers={tableDialogHeaders}
        rows={tableDialogRows}
        setHeaders={setTableDialogHeaders}
        setRows={setTableDialogRows}
        onSave={saveTableDialog}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importJson={importJson}
        setImportJson={setImportJson}
        importMutation={importMutation}
        onImport={(records) => importMutation.mutate(records)}
      />
    </div>
  );
}
