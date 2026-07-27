import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Key, AlertTriangle, CheckCircle2, Eye, EyeOff, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface CohereKey {
  key: string;
  label: string;
  request_count: number;
  created_at: string;
}

export default function ArchonKeysPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      setLoading(false);
    };
    check();
  }, [navigate]);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("cohere_api_keys")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const keys: CohereKey[] = (settings?.cohere_api_keys as unknown as CohereKey[]) || [];
  const totalRequests = keys.reduce((sum, k) => sum + (k.request_count || 0), 0);
  const totalRemaining = keys.reduce((sum, k) => sum + Math.max(0, 1000 - (k.request_count || 0)), 0);

  const addKeyMutation = useMutation({
    mutationFn: async ({ key, label }: { key: string; label: string }) => {
      const newKeyObj: CohereKey = {
        key,
        label: label || `Key ${keys.length + 1}`,
        request_count: 0,
        created_at: new Date().toISOString(),
      };
      const updatedKeys = [...keys, newKeyObj];
      const { error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: user!.id, cohere_api_keys: updatedKeys },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", user?.id] });
      setNewKey("");
      setNewLabel("");
      toast({ title: "API key added successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to add key", description: e.message, variant: "destructive" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (index: number) => {
      const updatedKeys = keys.filter((_, i) => i !== index);
      const { error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: user!.id, cohere_api_keys: updatedKeys },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", user?.id] });
      setDeleteIndex(null);
      toast({ title: "API key removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to remove key", description: e.message, variant: "destructive" });
    },
  });

  const handleAddKey = () => {
    if (!newKey.trim()) {
      toast({ title: "Please enter an API key", variant: "destructive" });
      return;
    }
    if (!newKey.trim().startsWith("co")) {
      toast({ title: "Invalid key format", description: "Cohere API keys typically start with 'co'", variant: "destructive" });
      return;
    }
    addKeyMutation.mutate({ key: newKey.trim(), label: newLabel.trim() });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key[0] + "*".repeat(key.length - 2) + key[key.length - 1];
    return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ARCHON AI Keys</h1>
            <p className="text-sm text-muted-foreground">Manage your Cohere API keys for ARCHON AI</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{keys.length}</div>
              <div className="text-xs text-muted-foreground">Active Keys</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Used This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${totalRemaining < 100 ? "text-destructive" : "text-success"}`}>{totalRemaining.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Key Form */}
        <Card className="mb-6">
          <CardHeader className="p-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add API Key
            </CardTitle>
            <CardDescription className="text-xs">
              Each key allows 1,000 requests per month. Keys are reset on the 1st of each month.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Production Key"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cohere API Key</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="co..."
                type="password"
                className="h-8 text-sm font-mono"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!newKey.trim() || addKeyMutation.isPending}
              onClick={handleAddKey}
            >
              {addKeyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Key
            </Button>
          </CardContent>
        </Card>

        {/* Key List */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              Your Keys ({keys.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {settingsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No API keys added yet.</p>
                <p className="text-xs mt-1">Add a Cohere API key above to start using ARCHON AI.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((k, index) => {
                  const usagePercent = ((k.request_count || 0) / 1000) * 100;
                  const isExhausted = (k.request_count || 0) >= 1000;
                  const isWarning = usagePercent >= 80;
                  return (
                    <div key={index} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{k.label}</span>
                          {isExhausted ? (
                            <Badge variant="destructive" className="text-[10px]">Exhausted</Badge>
                          ) : isWarning ? (
                            <Badge variant="outline" className="text-[10px] border-warning text-warning">Low</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-success text-success">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setShowKeys(prev => ({ ...prev, [index]: !prev[index] }))}
                          >
                            {showKeys[index] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteIndex(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {showKeys[index] ? k.key : maskKey(k.key)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isExhausted ? "bg-destructive" : isWarning ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {k.request_count || 0}/1,000
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Added {new Date(k.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Important Notes
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Each key allows <strong>1,000 requests per month</strong>.</li>
            <li>Usage resets on the <strong>1st of each month</strong>.</li>
            <li>SQL execution is restricted to <strong>admin accounts only</strong>.</li>
            <li>Your keys are stored securely and only accessible by you.</li>
            <li>Get Cohere API keys at <a href="https://dashboard.cohere.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">dashboard.cohere.com</a></li>
          </ul>
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this API key? This will not affect any ongoing requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteIndex !== null) deleteKeyMutation.mutate(deleteIndex); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
