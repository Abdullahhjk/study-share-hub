import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Loader2,
  MailCheck,
  LockKeyhole,
  ArrowLeft,
  Smartphone,
  KeyRound,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TotpEnrollPanel } from "@/components/settings/TotpEnrollPanel";
import type { TotpEnrollment } from "@/components/settings/TotpEnrollPanel";
import {
  mfaErrorMessage,
  qrCodeSrc,
  RECOVERY_KEY,
  reauthenticateWithPassword,
  removeVerifiedTotpExcept,
  resetMfaFactors,
  sendRecoveryOtp,
  startTotpEnrollment,
} from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";

type Step = "checking" | "send-link" | "sent" | "reauth" | "enroll";

/**
 * Single-admin lost-authenticator recovery.
 *
 * GoTrue refuses to enroll a new factor (and to unenroll a verified one)
 * below AAL2, so a lost authenticator can never be replaced purely through
 * the client. Recovery therefore:
 *
 *  1. Proves fresh primary authentication —
 *     a single-use, expiring magic link emailed to the admin
 *     (`amr.method === "otp"` proves the session came from email), or
 *     a fresh password sign-in (amr `password` within 15 minutes).
 *  2. Calls the `reset-mfa` edge function, which re-validates that proof
 *     server-side from the JWT and removes the old verified factor.
 *  3. Enrolls a brand-new factor at AAL1 (now allowed), verifies its code,
 *     and lands on "/" with a full page load.
 *
 * No codes, secrets or recovery tokens are stored or logged anywhere.
 */
export default function MfaRecover() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, currentLevel, recoverySession, loading, refresh } = useAuth();

  const [step, setStep] = useState<Step>("checking");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [reauthing, setReauthing] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);

  // Once password re-auth succeeds, keep the recovery flow on "enroll" even
  // though the fresh session reports AAL1 (which would otherwise re-trigger
  // the "send a recovery link" step).
  const completedReauth = useRef(false);

  // Decide which step applies for the current session.
  useEffect(() => {
    if (loading) return;
    if (completedReauth.current) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (recoverySession) {
      setStep("enroll");
    } else if (currentLevel === "aal2") {
      setStep("reauth");
    } else {
      setStep("send-link");
    }
  }, [loading, user, isAdmin, recoverySession, currentLevel, navigate]);

  // Entering the enroll step: remove the old factor server-side first (the
  // client alone is blocked at AAL1), then start a fresh enrollment.
  useEffect(() => {
    if (step !== "enroll" || enrollment || enrolling || resetting || enrollError) return;
    void startRecovery();
  }, [step, enrollment, enrolling, resetting, enrollError]);

  const startRecovery = async () => {
    setResetting(true);
    setEnrollError(null);
    const resetError = await resetMfaFactors();
    if (resetError) {
      setEnrollError(resetError);
      setResetting(false);
      return;
    }
    setResetting(false);
    void beginEnrollment();
  };

  const retryReset = () => {
    setEnrollError(null);
  };

  const beginEnrollment = async () => {
    setEnrolling(true);
    setEnrollError(null);
    try {
      const { data, error } = await startTotpEnrollment("Scholar Share");
      if (error || !data || !data.totp) {
        setEnrollError(mfaErrorMessage(error));
        return;
      }
      setEnrollment({
        id: data.id,
        qr: qrCodeSrc(data.totp.qr_code),
        secret: data.totp.secret,
        uri: data.totp.uri,
        name: data.friendly_name || "Authenticator",
      });
    } catch {
      setEnrollError("Could not start two-factor setup. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleSendLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setSending(true);
    setSendError(null);
    const { error } = await sendRecoveryOtp(user.email, `${window.location.origin}/mfa/recover`);
    if (error) {
      setSendError(mfaErrorMessage(error));
      setSending(false);
      return;
    }
    setSending(false);
    setStep("sent");
  };

  const handleReauth = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!password) {
      setReauthError("Enter your password to confirm your identity.");
      return;
    }

    setReauthing(true);
    setReauthError(null);

    const { error } = await reauthenticateWithPassword(user.email, password);
    if (error) {
      setReauthError(mfaErrorMessage(error));
      setPassword("");
      setReauthing(false);
      return;
    }

    // Fresh session (AAL1) created — this was a real password check.
    completedReauth.current = true;
    setReauthing(false);
    setPassword("");
    await refresh();
    setStep("enroll");
  };

  const handleVerified = async (factorId: string) => {
    // Session is at AAL2 after Supabase verified the new factor. The old
    // factor was already removed server-side; this is a safety net in case
    // any verified factor is somehow left over.
    const cleanupError = await removeVerifiedTotpExcept(factorId);
    if (cleanupError) {
      setEnrollError(cleanupError);
      return;
    }
    await refresh();
    // Session is now at AAL2; the recovery intent marker is no longer needed.
    sessionStorage.removeItem(RECOVERY_KEY);
    toast({ title: "Authenticator restored", description: "Your new authenticator app is now active." });
    window.location.href = "/";
  };

  const handleCancelEnroll = async () => {
    await supabase.auth.signOut({ scope: "local" });
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true });
    window.location.reload();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true });
    window.location.reload();
  };

  if (loading || step === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 py-12">
      <Card className="w-full max-w-lg rounded-2xl shadow-sm">
        <div className="p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm ring-1 ring-primary/20">
              <ShieldCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight">Recover your authenticator</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Set up a new authenticator app and sign in again.
              </p>
            </div>
          </div>

          {step === "send-link" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <MailCheck className="h-3.5 w-3.5 shrink-0" />
                We'll email a single-use, expiring recovery link to{" "}
                <span className="font-medium text-foreground">{user?.email}</span>.
              </div>

              {sendError && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {sendError}
                </div>
              )}

              <Button type="button" className="w-full" onClick={handleSendLink} disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send recovery link
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </div>
          )}

          {step === "sent" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <MailCheck className="h-3.5 w-3.5 shrink-0" />
                Check your inbox for a recovery link. It's single-use and expires, so use it soon.
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Clicking the link opens a secure setup that lets you replace your authenticator app.
                If you didn't request this, you can ignore the email — your existing codes keep working.
              </p>

              <Button type="button" variant="outline" className="w-full" onClick={handleSendLink} disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend link
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </div>
          )}

          {step === "reauth" && (
            <form onSubmit={handleReauth} noValidate className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                To replace your authenticator, confirm your password. A code from the old
                authenticator alone is not enough.
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recover-password">Password</Label>
                <div className="relative">
                  <Input
                    id="recover-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <LockKeyhole className="absolute inset-y-0 right-3 my-auto h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <p className="h-4 text-xs text-destructive" role={reauthError ? "alert" : undefined}>
                {reauthError ?? ""}
              </p>

              <Button type="submit" className="w-full" disabled={reauthing || !password}>
                {reauthing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
              <div className="flex items-center justify-center gap-3">
                <Button type="button" variant="outline" className="w-full" onClick={handleSignOut}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/admin")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to admin dashboard
                </Button>
              </div>
            </form>
          )}

          {step === "enroll" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                We'll remove your old authenticator, then scan the code below to set up a new one.
              </div>

              {resetting && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing your previous authenticator…
                </div>
              )}

              {enrolling && !enrollment && !resetting && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing your new authenticator…
                </div>
              )}

              {enrollError && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {enrollError}
                </div>
              )}

              {enrollError && !enrollment && (
                <Button type="button" variant="outline" className="w-full" onClick={retryReset} disabled={resetting}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              )}

              {enrollment && (
                <TotpEnrollPanel
                  enrollment={enrollment}
                  verifyLabel="Verify & restore"
                  onVerified={(factorId) => void handleVerified(factorId)}
                  onCancel={handleCancelEnroll}
                />
              )}

              {recoverySession && (
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                <KeyRound className="mr-1 inline h-3 w-3" />
                Recovery is managed by Supabase — codes and secrets are never stored here.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
