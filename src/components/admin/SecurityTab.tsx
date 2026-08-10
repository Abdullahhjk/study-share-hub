import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  Smartphone,
  RefreshCw,
  KeyRound,
  QrCode,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { TotpDialog } from "@/components/settings/TotpDialog";
import { TotpInput } from "@/components/TotpInput";
import {
  challengeAndVerifyTotp,
  listVerifiedTotpFactors,
  mfaErrorMessage,
} from "@/lib/mfa";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Two-factor (TOTP) security section for the Admin / Co-Admin dashboards.
 * Shown to admins and co-admins only — normal users never reach these routes.
 */
export function SecurityTab() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [factorName, setFactorName] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // "Test authenticator" dialog.
  const [testOpen, setTestOpen] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const testingRef = useRef(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
      }
    };

    getUser();
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const verified = await listVerifiedTotpFactors();
    setFactorName(
      verified.length > 0
        ? verified[0].friendly_name || "Authenticator"
        : null,
    );
    setFactorId(verified.length > 0 ? verified[0].id : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleDialogChange = async (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      await refresh();
      await loadStatus();
    }
  };

  // The QR code is stored locally at enrollment time (Supabase does not
  // expose it afterwards). Only show it when it matches the current factor.

  const openTestDialog = () => {
    setTestOpen(true);
    setTestCode("");
    setTestError(null);
    setTestResult(null);
  };

  const closeTestDialog = () => {
    setTestOpen(false);
    setTestCode("");
    setTestError(null);
    setTestResult(null);
  };

  // Auto-submit as soon as all six boxes are filled.
  useEffect(() => {
    if (!testOpen || testCode.length !== 6 || testing) return;
    void runTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCode]);

  const runTest = async () => {
    if (!factorId) return;
    if (!/^\d{6}$/.test(testCode)) return;
    if (testingRef.current) return;
    testingRef.current = true;

    setTesting(true);
    setTestError(null);
    setTestResult(null);

    const { error } = await challengeAndVerifyTotp(factorId, testCode);
    if (error) {
      setTestError(mfaErrorMessage(error));
      setTestCode("");
      setTesting(false);
      testingRef.current = false;
      return;
    }

    setTestResult("Your authenticator app is working correctly.");
    setTestCode("");
    setTesting(false);
    testingRef.current = false;
  };

  const handleTestSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (testCode.length === 6) void runTest();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Protect your account with two-factor authentication.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking two-factor authentication status…
            </div>
          ) : factorName ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      Two-factor authentication is enabled
                    </p>

                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600">
                      Enabled
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    You'll be asked for a 6-digit code from your authenticator app
                    whenever you sign in.
                  </p>

                  {user?.email && (
                    <p className="truncate text-xs text-muted-foreground">
                      Authenticator:{" "}
                      <span className="font-medium text-foreground">
                        {factorName} for {user?.email}<br />
                        <small className="text-muted-foreground">'scholar-share.netlify.app: {user?.email}'</small>
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  Manage 2FA
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={openTestDialog}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Test authenticator
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/mfa/recover")}
                >
                  Replace authenticator
                </Button>
              </div>

              <div className="flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5 shrink-0" />

                <span>Lost your authenticator?</span>

                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => navigate("/mfa/recover")}
                >
                  Recover your account
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Two-factor authentication is not enabled
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account. Once enabled,
                    you'll need a 6-digit code from your authenticator app after
                    signing in.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(true)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TotpDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
      />

      {/* Test authenticator dialog — shows the EXISTING QR (never generates a
          new factor) and verifies the code against the real factor. */}
      <Dialog open={testOpen} onOpenChange={(o) => (o ? openTestDialog() : closeTestDialog())}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Test authenticator
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app to confirm it's working.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <form onSubmit={handleTestSubmit} noValidate className="space-y-3">
              <div className="flex flex-col items-center gap-1.5">
                <TotpInput
                  value={testCode}
                  onChange={(v) => setTestCode(v)}
                  disabled={testing}
                  ariaLabel="6-digit authentication code"
                />
                <p className="h-4 text-xs text-destructive" role={testError ? "alert" : undefined}>
                  {testError ?? ""}
                </p>
              </div>

              {testResult && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  {testResult}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeTestDialog}>
                  Close
                </Button>
                <Button type="submit" disabled={testing || testCode.length !== 6}>
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
