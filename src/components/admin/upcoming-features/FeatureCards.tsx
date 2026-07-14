import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Rocket, Pencil, Trash2, Clock } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { DbFeature, ICON_MAP, statusOptions, renderDescriptionPreview } from "./types";

interface FeatureCardsProps {
  features: DbFeature[];
  openEdit: (f: DbFeature) => void;
  deleteMutation: UseMutationResult<any, Error, string, unknown>;
}

export default function FeatureCards({ features, openEdit, deleteMutation }: FeatureCardsProps) {
  if (features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Rocket className="mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No upcoming features yet</p>
      </div>
    );
  }

  return (
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
  );
}
