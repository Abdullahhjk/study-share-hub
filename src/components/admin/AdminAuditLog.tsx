import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search, Loader2, User, Shield, FileText, DollarSign, Settings, Activity } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  category: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

const CATEGORY_STYLES: Record<string, { icon: React.ReactNode; className: string }> = {
  admin: { icon: <Shield className="h-3.5 w-3.5" />, className: "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400" },
  auth: { icon: <User className="h-3.5 w-3.5" />, className: "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400" },
  note: { icon: <FileText className="h-3.5 w-3.5" />, className: "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/15 dark:text-green-400" },
  payment: { icon: <DollarSign className="h-3.5 w-3.5" />, className: "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400" },
  general: { icon: <Settings className="h-3.5 w-3.5" />, className: "bg-muted text-muted-foreground" },
};

const CATEGORY_OPTIONS = ["all", "admin", "auth", "note", "payment", "general"];

export default function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs", categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs" as any)
        .select("id, user_id, action, category, details, ip_address, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data: logData, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((logData || []).map((l: any) => l.user_id).filter(Boolean))];
      const profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => { profilesMap[p.id] = { full_name: p.full_name, email: p.email }; });
      }

      return (logData || []).map((l: any) => ({
        ...l,
        profiles: l.user_id ? profilesMap[l.user_id] || null : null,
      })) as AuditLogEntry[];
    },
  });

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.profiles?.full_name?.toLowerCase().includes(q) ||
      l.profiles?.email?.toLowerCase().includes(q) ||
      JSON.stringify(l.details).toLowerCase().includes(q)
    );
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Audit Log</CardTitle>
        <CardDescription>Track all admin and system actions across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(c => (
                <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No logs found.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto border rounded-md p-2 min-h-[500px] max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((log, index) => {
                    const catStyle = CATEGORY_STYLES[log.category] || CATEGORY_STYLES.general;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{index + 1}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell className="text-xs">
                          {log.profiles ? (
                            <div>
                              <p className="font-medium">{log.profiles.full_name || "Unknown"}</p>
                              <p className="text-muted-foreground">{log.profiles.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${catStyle.className}`}>
                            {catStyle.icon}
                            {log.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.action}</TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate" title={JSON.stringify(log.details)}>
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <span className="text-muted-foreground">{Object.entries(log.details).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {paged.map(log => {
                const catStyle = CATEGORY_STYLES[log.category] || CATEGORY_STYLES.general;
                return (
                  <div key={log.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`gap-1 text-[10px] ${catStyle.className}`}>
                        {catStyle.icon}
                        {log.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
                    </div>
                    <p className="text-xs font-mono font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.profiles?.full_name || "System"}</p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate" title={JSON.stringify(log.details)}>
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">{filtered.length} total entries</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-xs px-3 py-1 rounded border hover:bg-muted disabled:opacity-50">Prev</button>
                  <span className="text-xs text-muted-foreground px-2 py-1">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="text-xs px-3 py-1 rounded border hover:bg-muted disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
