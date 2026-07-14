import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";

interface TableEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  rows: string[][];
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  setRows: React.Dispatch<React.SetStateAction<string[][]>>;
  onSave: () => void;
}

export default function TableEditDialog({
  open,
  onOpenChange,
  headers,
  rows,
  setHeaders,
  setRows,
  onSave,
}: TableEditDialogProps) {
  function addRow() {
    setRows((prev) => [...prev, headers.map(() => "")]);
  }

  function removeRow(ri: number) {
    setRows((prev) => prev.filter((_, i) => i !== ri));
  }

  function addColumn() {
    setHeaders((prev) => [...prev, ""]);
    setRows((prev) => prev.map((row) => [...row, ""]));
  }

  function removeColumn(ci: number) {
    setHeaders((prev) => prev.filter((_, i) => i !== ci));
    setRows((prev) => prev.map((row) => row.filter((_, i) => i !== ci)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>
              Edit headers and cells directly. Add or remove rows and columns as needed.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-1.5 py-1 w-7 text-center text-muted-foreground font-normal">#</th>
                  {headers.map((header, ci) => (
                    <th key={ci} className="px-1 py-1">
                      <div className="flex items-center gap-1">
                        <Input
                          value={header}
                          onChange={(e) => setHeaders((prev) => {
                            const next = [...prev];
                            next[ci] = e.target.value;
                            return next;
                          })}
                          placeholder={`Col ${ci + 1}`}
                          className="h-7 text-xs flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon"
                          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeColumn(ci)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </th>
                  ))}
                  <th className="px-1 py-1 w-8">
                    <Button type="button" variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={addColumn}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b last:border-0">
                    <td className="px-1.5 py-1 text-center text-muted-foreground">{ri + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-1 py-1">
                        <Textarea
                          value={cell}
                          rows={2}
                          onChange={(e) => setRows((prev) => {
                            const next = [...prev];
                            next[ri] = [...next[ri]];
                            next[ri][ci] = e.target.value;
                            return next;
                          })}
                          placeholder="..."
                          className="h-7 text-xs resize-none"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 w-8">
                      <Button type="button" variant="ghost" size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(ri)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 mt-2" onClick={addRow}>
            <Plus className="h-3 w-3" />
            Add Row
          </Button>
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-2 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save Table</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
