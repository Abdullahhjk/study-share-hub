import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MonitorSmartphone, Monitor, Smartphone, Globe, Trash2, LogOut, Info } from "lucide-react";
import { toast } from "sonner";

interface SessionRow {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  refreshed_at: string | null;
  not_after: string | null;
}

function parseUserAgent(ua: string | null): { label: string; icon: React.ReactNode } {
  if (!ua) return { label: "Unknown device", icon: <Globe className="h-4 w-4" /> };
  const isMobile = /Mobile|iPhone|iPad|Android/i.test(ua);
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  const os = /Windows/i.test(ua) ? "Windows" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Linux/i.test(ua) ? "Linux" : "";
  return {
    label: [browser, os].filter(Boolean).join(" · ") + (isMobile ? " (Mobile)" : ""),
    icon: isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />,
  };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [maxSessions, setMaxSessions] = useState(5);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("session-manager", { body: { action: "list" } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setSessions(data.sessions || []);
      setCurrentSessionId(data.currentSessionId || null);
      setMaxSessions(data.maxSessions || 5);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const { data, error } = await supabase.functions.invoke("session-manager", { body: { action: "revoke", sessionId } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success("Session revoked");
      fetchSessions();
    } catch (e: any) {
      toast.error(`Failed to revoke session: ${e.message}`);
    } finally {
      setRevoking(null);
    }
  };

  const revokeOthers = async () => {
    try {
      setProcessing(true);
      const { data, error } = await supabase.functions.invoke("session-manager", { body: { action: "revokeOthers" } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Signed out ${data.revokedCount} other session(s)`);
      fetchSessions();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
      setProcessing(false);
    }
    finally {
      setProcessing(false);
    }
  };

  const othersCount = sessions.filter((s) => s.id !== currentSessionId).length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading sessions...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to Load Sessions</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 container max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MonitorSmartphone className="h-8 w-8 text-primary" />
              Active Sessions
            </h1>
            <p className="text-muted-foreground mt-1">
              Devices currently signed in to your account.
            </p>
          </div>
          {othersCount > 0 && (
            <Button variant="outline" size="sm" onClick={revokeOthers} disabled={processing} className={`${processing ? "cursor-not-allowed" : "cursor-pointer"}`}>
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Sign out others ({othersCount})
            </Button>
          )}
        </div>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">
              You can be signed in on up to <span className="font-semibold text-foreground">{maxSessions} devices</span> at once.
              Logging in or out on one device never affects the others — only when the limit is exceeded are your
              oldest sessions automatically removed ({sessions.length}/{maxSessions} in use).
            </span>
          </CardContent>
        </Card>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No active sessions found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              const device = parseUserAgent(session.user_agent);
              return (
                <Card key={session.id} className={isCurrent ? "border-primary/50 bg-primary/5" : ""}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-1 shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {device.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {device.label}
                          {isCurrent && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">This device</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {session.ip || "Unknown IP"} · Active {relativeTime(session.updated_at)}
                        </div>
                        <div className="text-xs text-muted-foreground/70">
                          Signed in {new Date(session.created_at).toLocaleString()}
                          {session.refreshed_at && ` · Last refresh ${relativeTime(session.refreshed_at)}`}
                        </div>
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => revokeSession(session.id)}
                        disabled={revoking === session.id}
                        title="Revoke this session"
                      >
                        {revoking === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
