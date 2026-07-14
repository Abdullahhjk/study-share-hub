import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Pencil } from "lucide-react";
import {
  FeatureForm,
  ContentBlock,
  ICON_MAP,
  ICON_NAMES,
  statusOptions,
} from "./types";

interface FeatureFormFieldsProps {
  form: FeatureForm;
  setFormAndSync: (updater: FeatureForm | ((prev: FeatureForm) => FeatureForm)) => void;
  addBlock: () => void;
  removeBlock: (idx: number) => void;
  updateBlock: (idx: number, block: ContentBlock) => void;
  addListItem: (blockIdx: number) => void;
  updateListItem: (blockIdx: number, itemIdx: number, value: string) => void;
  removeListItem: (blockIdx: number, itemIdx: number) => void;
  openTableDialog: (blockIdx: number) => void;
}

export default function FeatureFormFields({
  form,
  setFormAndSync,
  addBlock,
  removeBlock,
  updateBlock,
  addListItem,
  updateListItem,
  removeListItem,
  openTableDialog,
}: FeatureFormFieldsProps) {
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Description Content</Label>
          <Button type="button" variant="outline" size="sm" onClick={addBlock} className="gap-1 text-xs h-7">
            <Plus className="h-3 w-3" />
            Add Block
          </Button>
        </div>

        {Array.isArray(form.description) && form.description.map((block, bi) => (
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
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-1.5 py-1 w-7 text-center text-muted-foreground font-normal">#</th>
                        {(block.headers ?? []).map((header, hi) => (
                          <th key={hi} className="px-2 py-1 text-left font-medium">
                            {header || <span className="text-muted-foreground italic">Col {hi + 1}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(block.rows ?? []).map((row, ri) => (
                        <tr key={ri} className="border-b last:border-0">
                          <td className="px-1.5 py-1 text-center text-muted-foreground">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1">{cell || <span className="text-muted-foreground italic">...</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openTableDialog(bi)}>
                  <Pencil className="h-3 w-3" />
                  Edit Table
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
