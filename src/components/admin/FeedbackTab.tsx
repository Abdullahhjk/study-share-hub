import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Archive, RotateCcw, Search, Eye, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Feedback {
  id: string;
  email: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const statusStyles: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  reviewed: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function FeedbackTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Feedback[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("feedback")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
  });

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      const matchesStatus =
        statusFilter === "all" || f.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        f.email.toLowerCase().includes(q) ||
        f.message.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [feedback, statusFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No feedback found.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <Card key={f.id} className="relative">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{f.email}</p>
                  <Badge variant="outline" className={statusStyles[f.status] ?? ""}>
                    {f.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {format(new Date(f.created_at), "MMM d, yyyy h:mm a")}
                </p>

                <p className="text-sm line-clamp-4 leading-relaxed">
                  {f.message}
                </p>

                <div className="flex gap-2 pt-1">
                  {f.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: f.id,
                          status: "archived",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                  )}
                  {f.status === "new" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: f.id,
                          status: "reviewed",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Mark Reviewed
                    </Button>
                  )}
                  {f.status === "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: f.id,
                          status: "new",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
