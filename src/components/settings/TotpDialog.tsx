import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldOff, Loader2, Smartphone, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TotpInput } from "@/components/TotpInput";
import { TotpEnrollPanel } from "@/components/settings/TotpEnrollPanel";
import type { TotpEnrollment } from "@/components/settings/TotpEnrollPanel";
import {
  challengeFactor,
  listVerifiedTotpFactors,
  mfaErrorMessage,
  qrCodeSrc,
  startTotpEnrollment,
  unenrollFactor,
  verifyTotpCode,
} from "@/lib/mfa";

interface EnrolledFactor {
  id: string;
  name: string;
}

interface TotpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin/coadmin two-factor authentication manager.
 *
 * Enable: enrolls a new TOTP factor via Supabase's native API and only marks
 * it enabled after the 6-digit code verifies. Disable: always re-verifies a
 * fresh code before unenrolling (an AAL2 session alone is not enough).
 * Replacement (lost authenticator) is routed to /mfa/recover, which requires
 * fresh password re-authentication and verifies the new factor before the old
 * one is removed.
 */
export function TotpDialog({ open, onOpenChange }: TotpDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<EnrolledFactor | null>(null);
  // enrollment
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // disable
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const disablingRef = useRef(false);

  // Auto-submit as soon as all six boxes are filled.
  useEffect(() => {
    if (!disableOpen || disableCode.length !== 6 || disabling) return;
    void confirmDisable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableCode]);

  const loadFactor = useCallback(async () => {
    setLoading(true);
    const verified = await listVerifiedTotpFactors();
    setFactor(
      verified.length > 0
        ? { id: verified[0].id, name: verified[0].friendly_name || "Authenticator" }
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setEnrollment(null);
      setEnrollError(null);
      setDisableError(null);
      void loadFactor();
    }
  }, [open, loadFactor]);

  const startEnroll = async () => {
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

  const handleVerified = async (factorId: string) => {
    await refresh();
    await loadFactor();
    setEnrollment(null);
    setEnrollError(null);
    toast({ title: "Two-factor enabled", description: "Your account is now protected by an authenticator app." });
  };

  const openDisable = () => {
    setDisableOpen(true);
    setDisableCode("");
    setDisableError(null);
  };

  const confirmDisable = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!factor) return;
    if (!/^\d{6}$/.test(disableCode)) {
      setDisableError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (disablingRef.current) return;
    disablingRef.current = true;

    setDisabling(true);
    setDisableError(null);

    try {
      // Fresh code re-authentication before removing the factor.
      const { data: challenge, error: challengeError } = await challengeFactor(factor.id);
      if (challengeError) {
        setDisableError(mfaErrorMessage(challengeError));
        setDisabling(false);
        disablingRef.current = false;
        return;
      }

      const { error: verifyError } = await verifyTotpCode(factor.id, challenge.id, disableCode);
      if (verifyError) {
        setDisableError(mfaErrorMessage(verifyError));
        setDisableCode("");
        setDisabling(false);
        disablingRef.current = false;
        return;
      }

      const { error: unenrollError } = await unenrollFactor(factor.id);
      if (unenrollError) {
        setDisableError(mfaErrorMessage(unenrollError));
        setDisabling(false);
        disablingRef.current = false;
        return;
      }

      await refresh();
      await loadFactor();
      setDisableOpen(false);
      setDisableCode("");
      setDisabling(false);
      disablingRef.current = false;
      toast({ title: "Two-factor disabled", description: "Authenticator sign-in codes are no longer required." });
    } catch {
      setDisableError("Something went wrong. Please try again.");
      setDisabling(false);
      disablingRef.current = false;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Two-factor authentication
            </DialogTitle>
            <DialogDescription>
              Protect your admin account with an authenticator app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking two-factor status…
              </div>
            ) : factor && !enrollment ? (
              <>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-green-600" />
                    Enabled — <span className="font-medium text-foreground">'scholar-share.netlify.app: {user?.email}'.</span>
                  </span>
                  <span>You'll enter a code from this app after signing in.</span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={openDisable}>
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/mfa/recover")}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Replace authenticator
                  </Button>
                </div>
              </>
            ) : !factor && !enrollment ? (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Two-factor authentication is not enabled for your account. When enabled, admins
                  must enter a 6-digit code from their authenticator app after signing in.
                </p>

                {enrollError && (
                  <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {enrollError}
                  </div>
                )}

                <Button type="button" className="w-full" onClick={() => void startEnroll()} disabled={enrolling}>
                  {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {enrolling ? "Generating…" : "Enable 2FA"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Scan the QR code with your authenticator app (Google Authenticator, Authy,
                  1Password…), then enter the 6-digit code to enable two-factor authentication.
                </p>

                {enrollError && (
                  <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {enrollError}
                  </div>
                )}

                {enrollment && (
                  <TotpEnrollPanel
                    enrollment={enrollment}
                    onVerified={(factorId) => void handleVerified(factorId)}
                    onCancel={() => setEnrollment(null)}
                    cancelDisabled={enrolling}
                  />
                )}
              </>
            )}

            {!loading && (
              <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                <KeyRound className="h-3 w-3" />
                Lost your authenticator?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => navigate("/mfa/recover")}
                >
                  Recover your account
                </button>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog >

      <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the current 6-digit code from your authenticator app to confirm. Your account
              will stop requiring a code after sign-in.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={confirmDisable} noValidate className="space-y-2">
            <TotpInput
              value={disableCode}
              onChange={(v) => setDisableCode(v)}
              disabled={disabling}
              ariaLabel="Authentication code"
              autoFocus
            />
            <p className="h-4 text-xs text-center text-destructive" role={disableError ? "alert" : undefined}>
              {disableError ?? ""}
            </p>
          </form>

          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setDisableOpen(false)} disabled={disabling}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabling || disableCode.length !== 6}>
              {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
