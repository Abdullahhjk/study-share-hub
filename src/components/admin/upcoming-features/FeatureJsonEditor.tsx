import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { Sparkles, Loader2 } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

interface FeatureJsonEditorProps {
  jsonText: string;
  jsonError: string | null;
  customInstructions: string;
  setCustomInstructions: (v: string) => void;
  handleJsonChange: (value: string) => void;
  enhanceMutation: UseMutationResult<any, Error, void, unknown>;
}

export default function FeatureJsonEditor({
  jsonText,
  jsonError,
  customInstructions,
  setCustomInstructions,
  handleJsonChange,
  enhanceMutation,
}: FeatureJsonEditorProps) {
  return (
    <div className="space-y-2 py-2 h-full">
      <Label>JSON Editor</Label>
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
          {enhanceMutation.isPending ? "Enhancing..." : "Enhance"}
        </Button>
      </div>
      {jsonError && (
        <p className="text-xs text-destructive font-medium mt-1">{jsonError}</p>
      )}
      <CodeMirror
        height="350px"
        theme="dark"
        value={jsonText}
        onChange={(value) => handleJsonChange(value ?? "")}
        extensions={[json(), EditorView.lineWrapping]}
        basicSetup={{
          lineNumbers: true,
          tabSize: 2,
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        Edit the JSON directly. Valid JSON is automatically synced to the form.
      </p>
    </div>
  );
}
