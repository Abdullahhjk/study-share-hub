import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Save, ExternalLink, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, FileText, X, HelpCircle, User } from "lucide-react";

export default function CohereApiKey() {
  const [keys, setKeys] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showWhyHelp, setShowWhyHelp] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [keyCount, setKeyCount] = useState<number | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ K_u: number; Q: number; R_u: number; used: number; remaining: number } | null>(null);
  const [countLoading, setCountLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); }
      setSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) { setCountLoading(false); return; }
    const fetchCount = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-key-count?user_id=${encodeURIComponent(user.id)}`
        );
        const data = await res.json();
        if (data.count !== undefined) setKeyCount(data.count);
        if (data.R_u !== undefined) setQuotaInfo(data);
      } catch { /* ignore */ } finally {
        setCountLoading(false);
      }
    };
    fetchCount();
  }, [user]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleAddKey = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (keys.includes(trimmed)) {
      setError("This API key has already been added.");
      return;
    }
    setKeys([...keys, trimmed]);
    setInputValue("");
    setError(null);
  };

  const handleRemoveKey = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(keys[index]);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const newKeys = [...keys];
    newKeys[index] = trimmed;
    setKeys(newKeys);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleSubmit = async () => {
    if (keys.length === 0) {
      setError("Please add at least one API key before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rows = keys.map((key) => ({ api_key: key, user_id: user.id }));
      const { error: insertError } = await supabase
        .from("cohere_user_api_keys")
        .insert(rows);

      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit API keys.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">API Keys Submitted</h1>
            <p className="text-muted-foreground">
              Thank you! Your Cohere API keys ({keys.length}) have been submitted successfully.
              The ARCHON AI system will use these keys to provide AI-powered features.
            </p>
            <Button variant="outline" onClick={() => { setKeys([]); setSubmitted(false); }}>
              Submit More Keys
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <Key className="h-10 w-10 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-bold">Cohere API Key Setup</h1>
              <Button variant="ghost" size="icon" onClick={() => setShowWhyHelp(true)} className="rounded-full">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            <p className="text-muted-foreground">
              To use ARCHON AI features, you need to provide at least one Cohere API key.
            </p>
            {user && !countLoading && keyCount !== null && (
              <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>You have <strong>{keyCount}</strong> key{keyCount !== 1 ? "s" : ""} active</span>
                </div>
                {quotaInfo && (
                  <div className="flex items-center gap-1.5 text-xs bg-muted rounded-md px-3 py-1.5">
                    <span>
                      R<sub>u</sub> = <strong>{quotaInfo.Q}</strong> &times; <strong>{quotaInfo.K_u}</strong> = <strong>{quotaInfo.R_u.toLocaleString()}</strong> requests/month
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>
                      Used: <strong>{quotaInfo.used.toLocaleString()}</strong>
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>
                      Remaining: <strong>{quotaInfo.remaining.toLocaleString()}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="h-5 w-5" />
                Step-by-Step Guide
              </CardTitle>
              <CardDescription>
                Follow these steps to get your Cohere API key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center p-0">1</Badge>
                  <div>
                    <p className="font-medium">Create a Cohere Account</p>
                    <p className="text-muted-foreground">
                      Go to{" "}
                      <a
                        href="https://dashboard.cohere.com/welcome/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        dashboard.cohere.com <ExternalLink className="h-3 w-3 inline" />
                      </a>{" "}
                      and sign up for a free account.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center p-0">2</Badge>
                  <div>
                    <p className="font-medium">Navigate to API Keys</p>
                    <p className="text-muted-foreground">
                      Go to the{" "}
                      <a
                        href="https://dashboard.cohere.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        API Keys page <ExternalLink className="h-3 w-3 inline" />
                      </a>{" "}
                      via the sidebar or the direct link.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center p-0">3</Badge>
                  <div>
                    <p className="font-medium">Copy Your Trial Key</p>
                    <p className="text-muted-foreground">
                      Under <strong>Trial keys</strong>, click the <Eye className="h-3 w-3 inline" /> icon to reveal
                      your key, then copy it and paste it below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Note:
                </p>
                <p>
                  Each free Cohere trial key provides 1,000 requests per month.
                  You can add multiple keys to increase your monthly limit.
                  Read the{" "}
                  <button
                    onClick={() => setShowPolicy(true)}
                    className="text-primary underline underline-offset-2"
                  >
                    AI Usage Policy
                  </button>{" "}
                  for details.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Your API Keys</CardTitle>
              <CardDescription>
                You can add multiple keys. Each key contributes to your monthly request quota.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste your Cohere API key here..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKey()}
                />
                <Button onClick={handleAddKey}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {keys.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">
                    {keys.length} key{keys.length !== 1 ? "s" : ""} added
                  </p>
                  {keys.map((key, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg border p-3"
                    >
                      {editingIndex === index ? (
                        <>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(index);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(index)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                          <code className="flex-1 text-sm truncate font-mono">{key}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(index)}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveKey(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={keys.length === 0 || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {submitting ? "Submitting..." : `Submit ${keys.length} API Key${keys.length !== 1 ? "s" : ""}`}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to the{" "}
                <button
                  onClick={() => setShowPolicy(true)}
                  className="text-primary underline underline-offset-2"
                >
                  AI Usage Policy
                </button>
              </p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showPolicy} onOpenChange={setShowPolicy}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">AI Usage Policy for Scholar Share</DialogTitle>
              <DialogDescription>
                To ensure fair, secure, and sustainable access to AI-powered features on Scholar Share, the following
                AI Usage Policy governs the contribution and use of API keys and AI resources on the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-base">1. API Key Contribution</h3>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-muted-foreground">
                  <li>Users may optionally provide valid API keys to enable and expand access to AI-powered features on Scholar Share.</li>
                  <li>Contributed API keys are securely stored and managed by the platform for authorized AI feature execution.</li>
                  <li>Users must only contribute API keys they are legally authorized to use.</li>
                  <li>Submitted API keys cannot be removed individually after submission.</li>
                  <li>API keys are permanently deleted only when a user requests account deletion.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base">2. Rate Limits</h3>
                <p className="text-muted-foreground mt-1">
                  AI usage is subject to rate limits and quotas imposed by the underlying AI provider, including Cohere.
                  Each contributed API key contributes a fixed monthly request quota based on the provider's limits.
                </p>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="font-medium">Rate Limit Formula</p>
                  <p className="text-muted-foreground mt-1">
                    The monthly request allocation for a user is calculated as:
                  </p>
                  <p className="font-mono text-center my-2">
                    R<sub>u</sub> = Q &middot; K<sub>u</sub>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Where R<sub>u</sub> = User's monthly request allocation, Q = Monthly request quota per API key,
                    K<sub>u</sub> = Number of valid API keys contributed by the user.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    If each API key provides 1,000 requests per month: R<sub>u</sub> = 1000 &middot; K<sub>u</sub>
                  </p>
                  <ul className="list-disc pl-5 mt-1 text-muted-foreground text-xs">
                    <li>1 key &rarr; 1,000 requests/month</li>
                    <li>5 keys &rarr; 5,000 requests/month</li>
                    <li>10 keys &rarr; 10,000 requests/month</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base">3. Additional Key Contributions</h3>
                <p className="text-muted-foreground mt-1">
                  Users may increase their available AI request allocation by contributing additional valid API keys
                  they are authorized to use. Invalid, expired, restricted, or revoked keys may reduce or disable
                  associated AI functionality.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base">4. Security and Storage</h3>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-muted-foreground">
                  <li>API keys are encrypted at rest and handled using industry-standard security practices.</li>
                  <li>Access to stored credentials is restricted to authorized platform systems and processes required for AI feature execution.</li>
                  <li>Scholar Share does not sell or publicly expose user API keys.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base">5. Fair Usage</h3>
                <p className="text-muted-foreground mt-1">
                  AI resources must be used responsibly and in accordance with applicable provider policies and platform
                  rules. Excessive automated abuse, resource exhaustion attempts, scraping, spam generation, or malicious
                  usage may result in temporary or permanent suspension of AI access.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base">6. Prohibited Activities</h3>
                <p className="text-muted-foreground mt-1">
                  Users may not use Scholar Share AI services for:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-muted-foreground">
                  <li>Illegal or fraudulent activities</li>
                  <li>Malware generation or distribution</li>
                  <li>Harassment, abuse, or harmful content generation</li>
                  <li>Unauthorized access attempts or exploitation</li>
                  <li>Circumvention of provider restrictions or platform safeguards</li>
                </ul>
                <p className="text-muted-foreground mt-1">
                  Violation of these rules may result in account suspension or permanent access revocation.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base">7. Transparency</h3>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-muted-foreground">
                  <li>Users may view their AI usage statistics and current request allocation through the Scholar Share dashboard.</li>
                  <li>Usage metrics may include request counts, remaining quota, and key contribution status.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base">8. Policy Changes</h3>
                <p className="text-muted-foreground mt-1">
                  Scholar Share reserves the right to modify this policy at any time to reflect operational, legal,
                  security, or provider-related changes. Material updates may be communicated through email, dashboard
                  notifications, or in-app announcements.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base">9. Support</h3>
                <p className="text-muted-foreground mt-1">
                  For questions, concerns, or abuse reports related to AI usage, contact support through the Scholar
                  Share feedback system.
                </p>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">
                By contributing API keys or using AI-powered features on Scholar Share, users acknowledge and agree
                to this AI Usage Policy.
              </p>
              <p className="text-xs font-medium">
                Scholar Share Team<br />
                <em>Share notes. Build mastery.</em>
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showWhyHelp} onOpenChange={setShowWhyHelp}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Why Do We Need an API Key?</DialogTitle>
              <DialogDescription>
                ARCHON AI uses Cohere's language models to power its AI features.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>ARCHON AI</strong> is an intelligent assistant built into Scholar Share that helps with tasks like
                answering questions, generating content, and providing recommendations.
              </p>
              <p>
                To run these AI features, the system makes requests to Cohere's API. Each request needs a valid API key
                to be processed. Cohere provides <strong>free trial keys</strong> that give you 1,000 requests per month
                per key.
              </p>
              <p>
                By contributing your own API key(s), you enable ARCHON AI for yourself and help expand AI access for the
                community. The more keys contributed, the more requests the system can handle collectively.
              </p>
              <p>
                Your keys are stored securely and only used for authorized AI feature execution. They are never shared
                publicly or sold.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
