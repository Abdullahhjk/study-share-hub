import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Activity, Search, ChevronLeft, ChevronRight, Globe, Monitor, Clock, FileText, ChartBarStacked, MousePointerClick, User, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ActivityLogsProps {
  userId?: string;
  isAdmin?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  notes: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  requests: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  profile: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  navigation: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const PAGE_SIZE = 10;

export function ActivityLogs({ userId, isAdmin = false }: ActivityLogsProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", userId, categoryFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (userId) query = query.eq("user_id", userId);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);

      const { data: logs, count, error } = await query;
      if (error) throw error;

      const profiles: Record<string, any> = {};
      if (isAdmin && logs?.length) {
        const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
        if (userIds.length) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          (profileData || []).forEach(p => (profiles[p.id] = p));
        }
      }

      return { logs: logs || [], total: count || 0, profiles };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const profiles = data?.profiles || {};
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    const profile = profiles[l.user_id];
    return (
      l.action?.toLowerCase().includes(s) ||
      l.category?.toLowerCase().includes(s) ||
      l.ip_address?.includes(search) ||
      profile?.full_name?.toLowerCase().includes(s) ||
      profile?.email?.toLowerCase().includes(s) ||
      JSON.stringify(l.details)?.toLowerCase().includes(s)
    );
  });

  const parseUserAgent = (ua: string) => {
    if (!ua) return "Unknown";
    if (ua.includes("Mobile")) return "Mobile";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Browser";
  };

  return (
    <Card className="mt-4 h-[800px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {isAdmin ? "All User Activity Logs" : "My Activity Log"}
        </CardTitle>
        <CardDescription>
          {isAdmin
            ? "Complete activity tracking for all users with IP addresses and timestamps."
            : "Your recent activity on the platform."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={isAdmin ? "Search by user, action, IP..." : "Search actions..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
              <SelectItem value="requests">Requests</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="navigation">Navigation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No activity logs found.
          </p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">{total} total entries</div>

            {/* SCROLL AREA */}
            <div className="flex-1 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>#</TableHead>
                    {isAdmin && <TableHead><User className="h-3.5 w-3.5 inline mr-1" />User</TableHead>}
                    <TableHead><MousePointerClick className="h-3.5 w-3.5 inline mr-1" />Action</TableHead>
                    <TableHead><ChartBarStacked className="h-3.5 w-3.5 inline mr-1" />Category</TableHead>
                    <TableHead><FileText className="h-3.5 w-3.5 inline mr-1" />Details</TableHead>
                    <TableHead><Globe className="h-3.5 w-3.5 inline mr-1" />IP</TableHead>
                    <TableHead><Monitor className="h-3.5 w-3.5 inline mr-1" />Device</TableHead>
                    <TableHead><Clock className="h-3.5 w-3.5 inline mr-1" />Time</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((log, index) => {
                    const profile = profiles[log.user_id];
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-sm">{(page * PAGE_SIZE) + index + 1}.</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div>
                              <p className="font-medium text-xs">{profile?.full_name || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {profile?.email || log.user_id?.slice(0, 8)}
                              </p>
                            </div>
                          </TableCell>
                        )}

                        <TableCell className="font-medium text-sm">
                          {log.action?.replace(/_/g, " ")}
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] ${CATEGORY_COLORS[log.category] || ""}`}>
                            {log.category}
                          </Badge>
                        </TableCell>

                        <TableCell className="max-w-[200px]">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <span className="text-xs text-muted-foreground truncate block">
                              {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs font-mono">
                          {log.ip_address || "—"}
                        </TableCell>

                        <TableCell className="text-xs">
                          {parseUserAgent(log.user_agent)}
                        </TableCell>

                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="sticky bottom-0 bg-background border-t pt-2 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}