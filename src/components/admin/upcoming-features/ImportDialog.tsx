import { Button } from "@/components/ui/button";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UseMutationResult } from "@tanstack/react-query";
import { validateImportItem } from "./types";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importMutation: UseMutationResult<any, Error, Record<string, unknown>[], unknown>;
  onImport: (records: Record<string, unknown>[]) => void;
}

export default function ImportDialog({
  open,
  onOpenChange,
  importJson,
  setImportJson,
  importMutation,
  onImport,
}: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Features from JSON</DialogTitle>
          <DialogDescription>
            Paste a JSON array of features. Each object needs a "title" field. Other fields (category, icon_name, target_date, status, description) are optional.
          </DialogDescription>
        </DialogHeader>

        <CodeMirror
          height="250px"
          width="100%"
          className="rounded-md border border-border"
          theme="dark"
          value={importJson}
          onChange={(value) => setImportJson(value ?? "")}
          extensions={[json(), EditorView.lineWrapping]}
          basicSetup={{
            lineNumbers: true,
            tabSize: 2,
          }}
        />

        {importJson.trim() && (
          <p className="text-xs text-muted-foreground">
            {(() => {
              try {
                const parsed = JSON.parse(importJson);
                if (!Array.isArray(parsed)) return <span className="text-destructive">Must be a JSON array, got {typeof parsed}. Example: {'[{"title":"My Feature"}]'}</span>;
                const allErrors: string[] = [];
                parsed.forEach((item: unknown, i: number) => allErrors.push(...validateImportItem(item, i)));
                if (allErrors.length > 0) return <span className="text-destructive whitespace-pre-line">{allErrors.join("\n")}</span>;
                return `Found ${parsed.length} valid feature(s)`;
              } catch {
                return <span className="text-destructive">Invalid JSON syntax. Check for missing commas, quotes, or brackets.</span>;
              }
            })()}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              try {
                const parsed = JSON.parse(importJson);
                if (!Array.isArray(parsed)) throw new Error("Must be a JSON array. Example: [{\"title\":\"My Feature\"}]");
                const allErrors: string[] = [];
                parsed.forEach((item: unknown, i: number) => allErrors.push(...validateImportItem(item, i)));
                if (allErrors.length > 0) throw new Error(allErrors.join("\n"));
                onImport(parsed);
              } catch (err: any) {
                // Toast is handled by caller
              }
            }}
            disabled={importMutation.isPending || !importJson.trim()}
          >
            {importMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
