import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Mail, Trash2, Plus, Pencil, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import BuildReportDialog, { BuildReport, Subscriber } from "./build-report/BuildReportDialog";

type ScreenSize = "small" | "medium" | "large";

const REPORT_THRESHOLDS: Record<ScreenSize, number> = {
    small: 3,
    medium: 6,
    large: 8,
};

function getScreenSize(width: number): ScreenSize {
    if (width >= 1024) return "large";
    if (width >= 768) return "medium";
    return "small";
}

function useScreenSize(): ScreenSize {
    const [size, setSize] = useState<ScreenSize>(() =>
        typeof window === "undefined" ? "large" : getScreenSize(window.innerWidth)
    );
    useEffect(() => {
        const onResize = () => setSize(getScreenSize(window.innerWidth));
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return size;
}

export default function BuildReportTab() {
    const qc = useQueryClient();
    const [showUnsubscribed, setShowUnsubscribed] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<BuildReport | null>(null);
    const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
    const [showAllReports, setShowAllReports] = useState(false);
    const [showAllSubscribers, setShowAllSubscribers] = useState(false);
    const screenSize = useScreenSize();
    const reportThreshold = REPORT_THRESHOLDS[screenSize];
    const subscriberThreshold = REPORT_THRESHOLDS[screenSize];

    const { data: subscribers = [] } = useQuery({
        queryKey: ["newsletter-subscribers"],
        queryFn: async () => {
            const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
            return (data ?? []) as Subscriber[];
        },
    });

    const { data: reports = [], isLoading: reportsLoading } = useQuery({
        queryKey: ["build-reports"],
        queryFn: async () => {
            const { data, error } = await supabase.from("build_reports").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            return (data ?? []) as BuildReport[];
        },
    });

    const hasMoreReports = reports.length > reportThreshold;
    const visibleReports = reports.slice(0, showAllReports ? reports.length : reportThreshold);

    const filteredSubscribers = subscribers.filter((s) =>
        showUnsubscribed ? s.is_active === false : true
    );
    const hasMoreSubscribers = filteredSubscribers.length > subscriberThreshold;
    const visibleSubscribers = filteredSubscribers.slice(0, showAllSubscribers ? filteredSubscribers.length : subscriberThreshold);

    const deleteReport = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("build_reports").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Report deleted");
            qc.invalidateQueries({ queryKey: ["build-reports"] });
        },
        onError: (e: Error) => toast.error("Failed to delete report", { description: e.message }),
    });

    const toggleSubscriberActive = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase.from("newsletter_subscribers").update({ is_active }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
            toast.dismiss("subscriber-152");
            setTimeout(() => {
                toast.success(`Subscriber status updated successfully!`, {
                    id: `subscriber-152`,
                });
            }, 500);
        },
        onError: (e: Error) => toast.error("Failed to update subscriber status", { description: e.message }),
    });

    const removeSubscriber = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] }); },
    });

    const openAdd = () => {
        setEditingReport(null);
        setDialogOpen(true);
    };

    const openEdit = (report: BuildReport) => {
        setEditingReport(report);
        setDialogOpen(true);
    };

    const copyEmail = async (id: string, email: string) => {
        try {
            await navigator.clipboard.writeText(email);
            setCopiedEmailId(id);
            toast.success("Email copied to clipboard");
            setTimeout(() => {
                setCopiedEmailId((cur) => (cur === id ? null : cur));
            }, 800);
        } catch {
            toast.error("Failed to copy email");
        }
    };

    return (
        <div className="space-y-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Saved Reports
                            </CardTitle>
                            <CardDescription>
                                Compose an update email to send to subscribers. AI generates the subject and HTML.
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={openAdd} className="gap-1.5 self-start">
                            <Plus className="h-4 w-4" />
                            Add Report
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {reportsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : reports.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No saved reports yet. Click "Add Report" to build your first one.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                            {visibleReports.map((r) => (
                                <div key={r.id} className="rounded-lg border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">{r.version}</Badge>
                                                {r.sent_at ? (
                                                    <Badge variant="default" className="bg-green-600">
                                                        Sent {new Date(r.sent_at).toLocaleDateString()}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Draft</Badge>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(r.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="mt-1.5 truncate font-medium">{r.subject || "No subject"}</p>
                                            <p className="line-clamp-2 text-xs text-muted-foreground">{r.changelog}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete report?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently remove "{r.subject || r.version}". This cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={() => deleteReport.mutate(r.id)}
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasMoreReports && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllReports((v) => !v)}
                                className="gap-1.5"
                            >
                                {showAllReports ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Show less ({reportThreshold})
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        See more ({reports.length - reportThreshold} more)
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Subscribers
                        </CardTitle>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                                Active: {subscribers.filter((s) => s.is_active !== false).length}
                            </Badge>

                            <Badge variant="secondary">
                                Total: {subscribers.length}
                            </Badge>

                            <Badge
                                variant="default"
                                className="cursor-pointer"
                                onClick={() => setShowUnsubscribed(!showUnsubscribed)}
                            >
                                Showing {showUnsubscribed ? "Unsubscribed" : "All"}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {filteredSubscribers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No {showUnsubscribed ? "Unsubscribed" : "Active"} subscribers yet.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {visibleSubscribers.map((s) => (
                                <div
                                    key={s.id}
                                    className="rounded-lg border p-3"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="truncate max-w-[200px] break-all font-medium">
                                                <Button onClick={() => copyEmail(s.id, s.email)} variant="link" className={`text-ghost-foreground ${copiedEmailId === s.id ? "txt-shimmer" : ""}`}>{s.email}</Button>
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                            <Badge variant="secondary">
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </Badge>

                                            <Badge
                                                variant={s.is_active ? "secondary" : "outline"}
                                                className={`cursor-pointer ${s.is_active
                                                    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                                                    : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                                                    }`}
                                                onClick={() =>
                                                    toggleSubscriberActive.mutate({
                                                        id: s.id,
                                                        is_active: !s.is_active,
                                                    })
                                                }
                                            >
                                                {s.is_active ? "Active" : "Inactive"}
                                            </Badge>

                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => removeSubscriber.mutate(s.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasMoreSubscribers && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllSubscribers((v) => !v)}
                                className="gap-1.5"
                            >
                                {showAllSubscribers ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Show less ({subscriberThreshold})
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        See more ({filteredSubscribers.length - subscriberThreshold} more)
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <BuildReportDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                subscribers={subscribers}
                editing={editingReport}
                onSaved={() => {
                    qc.invalidateQueries({ queryKey: ["build-reports"] });
                }}
            />
        </div>
    );
}
