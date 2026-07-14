import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UseMutationResult } from "@tanstack/react-query";
import { FeatureForm } from "./types";
import FeatureFormFields from "./FeatureFormFields";
import FeatureJsonEditor from "./FeatureJsonEditor";
import { ContentBlock } from "./types";

interface FeatureFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  form: FeatureForm;
  jsonText: string;
  jsonError: string | null;
  customInstructions: string;
  setCustomInstructions: (v: string) => void;
  handleJsonChange: (value: string) => void;
  enhanceMutation: UseMutationResult<any, Error, void, unknown>;
  upsertMutation: UseMutationResult<any, Error, { id?: string; data: FeatureForm }, unknown>;
  setFormAndSync: (updater: FeatureForm | ((prev: FeatureForm) => FeatureForm)) => void;
  addBlock: () => void;
  removeBlock: (idx: number) => void;
  updateBlock: (idx: number, block: ContentBlock) => void;
  addListItem: (blockIdx: number) => void;
  updateListItem: (blockIdx: number, itemIdx: number, value: string) => void;
  removeListItem: (blockIdx: number, itemIdx: number) => void;
  openTableDialog: (blockIdx: number) => void;
}

export default function FeatureFormDialog({
  open,
  onClose,
  editingId,
  form,
  jsonText,
  jsonError,
  customInstructions,
  setCustomInstructions,
  handleJsonChange,
  enhanceMutation,
  upsertMutation,
  setFormAndSync,
  addBlock,
  removeBlock,
  updateBlock,
  addListItem,
  updateListItem,
  removeListItem,
  openTableDialog,
}: FeatureFormDialogProps) {
  const [jsonWidthPct, setJsonWidthPct] = useState(50);

  const formContent = (
    <FeatureFormFields
      form={form}
      setFormAndSync={setFormAndSync}
      addBlock={addBlock}
      removeBlock={removeBlock}
      updateBlock={updateBlock}
      addListItem={addListItem}
      updateListItem={updateListItem}
      removeListItem={removeListItem}
      openTableDialog={openTableDialog}
    />
  );

  const jsonContent = (
    <FeatureJsonEditor
      jsonText={jsonText}
      jsonError={jsonError}
      customInstructions={customInstructions}
      setCustomInstructions={setCustomInstructions}
      handleJsonChange={handleJsonChange}
      enhanceMutation={enhanceMutation}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader className="space-y-1">
              <DialogTitle>
                {editingId ? "Edit Feature" : "Add Feature"} "{form.title}"
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the feature details below."
                  : "Fill in the details for the new feature."}
              </DialogDescription>
            </DialogHeader>

            <div className="hidden lg:flex items-center gap-2 shrink-0 absolute right-10">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">JSON width</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={40}
                  max={60}
                  value={jsonWidthPct}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setJsonWidthPct(Math.min(Math.max(v, 40), 60));
                  }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (isNaN(v)) setJsonWidthPct(50);
                    else setJsonWidthPct(Math.min(Math.max(v, 40), 60));
                  }}
                  className="h-7 w-16 text-xs text-center px-1"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="lg:hidden flex-1 min-h-0 overflow-y-auto p-6">
            <Tabs defaultValue="form">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="json">JSON Editor</TabsTrigger>
              </TabsList>
              <TabsContent value="form">{formContent}</TabsContent>
              <TabsContent value="json">{jsonContent}</TabsContent>
            </Tabs>
          </div>

          <div className="hidden lg:flex flex-1 min-h-0">
            <div
              className="min-h-0 overflow-y-auto px-6 py-4"
              style={{ width: `${100 - jsonWidthPct}%`, flexShrink: 0 }}
            >
              {formContent}
            </div>
            <div className="w-px bg-border shrink-0" />
            <div
              className="min-h-0 overflow-y-auto px-6 py-4"
              style={{ width: `${jsonWidthPct}%`, flexShrink: 0 }}
            >
              {jsonContent}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-2 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => upsertMutation.mutate({ id: editingId ?? undefined, data: form })}
            disabled={upsertMutation.isPending || !form.title.trim()}
          >
            {upsertMutation.isPending
              ? "Saving..."
              : editingId
                ? "Update"
                : "Add Feature"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
