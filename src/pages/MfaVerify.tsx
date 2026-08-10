import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, ShieldCheck, ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TotpInput } from "@/components/TotpInput";
import {
  challengeFactor,
  listVerifiedTotpFactors,
  mfaErrorMessage,
  verifyTotpCode,
} from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";

/**
 * TOTP verification screen. Shown to admins with an active TOTP factor whose
 * session has not yet reached AAL2. Verification upgrades the session through
 * Supabase Auth's native challenge/verify flow (server-assessed AAL), so a
 * plain "I clicked verify" flag cannot grant access.
 */
export default function MfaVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { toast } = useToast();

  const { user, isAdmin, mfaRequired, currentLevel, recoverySession, loading, refresh } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // Not authenticated -> back to sign in.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  // A recovery session (came in via the magic link) must go to /mfa/recover.
  useEffect(() => {
    if (loading) return;
    if (user && recoverySession) {
      navigate("/mfa/recover", { replace: true });
    }
  }, [loading, user, recoverySession, navigate]);

  // Already at AAL2 (or not an MFA-required admin) -> go where they were headed.
  useEffect(() => {
    if (loading) return;
    if (mfaRequired === false && user) {
      const target = currentLevel === "aal2" ? next : "/dashboard";
      navigate(target, { replace: true });
    }
  }, [loading, mfaRequired, currentLevel, user, next, navigate]);

  // Auto-submit as soon as all six boxes are filled.
  useEffect(() => {
    if (code.length !== 6 || submitting) return;
    void verifyCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true });
    window.location.reload();
  };

  const verifyCode = async (candidate: string) => {
    if (!/^\d{6}$/.test(candidate)) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const factors = await listVerifiedTotpFactors();
      const factor = factors[0];
      if (!factor) {
        setError("No active authenticator factor found for this account.");
        setCode("");
        submittedRef.current = false;
        return;
      }

      const { data: challenge, error: challengeError } = await challengeFactor(factor.id);
      if (challengeError) {
        setError(mfaErrorMessage(challengeError));
        setCode("");
        submittedRef.current = false;
        return;
      }

      const { error: verifyError } = await verifyTotpCode(factor.id, challenge.id, candidate);
      if (verifyError) {
        setError(mfaErrorMessage(verifyError));
        setCode("");
        submittedRef.current = false;
        return;
      }

      // Supabase upgrades the session to AAL2 on successful verify; re-read it.
      const snapshot = await refresh();
      if (snapshot.currentLevel !== "aal2") {
        setError("Verification did not complete. Please try again.");
        setCode("");
        submittedRef.current = false;
        return;
      }

      toast({ title: "Verified", description: "Two-factor authentication confirmed." });
      // Full page load so the app re-evaluates the upgraded session from scratch.
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Please try again.");
      setCode("");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (code.length === 6) void verifyCode(code);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 py-12">
      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <div className="p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm ring-1 ring-primary/20">
              <ShieldCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight">Two-factor authentication</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="mb-5 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              This step keeps your admin account protected.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="flex flex-col items-center gap-1.5">
              <TotpInput
                value={code}
                onChange={(v) => setCode(v)}
                autoFocus
                disabled={submitting}
                ariaLabel="6-digit authentication code"
              />
              <p className="h-4 text-xs text-destructive" role={error ? "alert" : undefined}>
                {error ?? ""}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />}
              Verify
            </Button>

            <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Lost your authenticator?{" "}
            <Link to="/mfa/recover" className="text-primary underline-offset-2 hover:underline">
              Recover your account
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
