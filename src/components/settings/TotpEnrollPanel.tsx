import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TotpInput } from "@/components/TotpInput";
import { challengeAndVerifyTotp, mfaErrorMessage } from "@/lib/mfa";

export interface TotpEnrollment {
  id: string;
  qr: string;
  secret: string;
  uri: string;
  name: string;
}

interface TotpEnrollPanelProps {
  enrollment: TotpEnrollment;
  /** Called only after Supabase confirms the code (factor becomes verified). */
  onVerified: (factorId: string) => void;
  verifyLabel?: string;
  onCancel?: () => void;
  cancelDisabled?: boolean;
}

/**
 * Shared TOTP enrollment step: shows the QR code + manual secret, then
 * verifies a 6-digit code through Supabase's native challenge/verify.
 * Used for first-time enrollment and for authenticator replacement during
 * account recovery. Nothing about the secret/code is stored here.
 */
export function TotpEnrollPanel({
  enrollment,
  onVerified,
  verifyLabel = "Verify & enable",
  onCancel,
  cancelDisabled = false,
}: TotpEnrollPanelProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifyingRef = useRef(false);

  // Auto-submit as soon as all six boxes are filled.
  useEffect(() => {
    if (code.length !== 6 || verifying) return;
    void handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Select and copy the secret manually.");
    }
  };

  const handleVerify = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    setVerifying(true);
    setError(null);

    const { data, error: verifyError } = await challengeAndVerifyTotp(enrollment.id, code);
    if (verifyError || !data) {
      setError(mfaErrorMessage(verifyError));
      setCode("");
      setVerifying(false);
      verifyingRef.current = false;
      return;
    }

    setVerifying(false);
    verifyingRef.current = false;
    onVerified(enrollment.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound className="h-3.5 w-3.5" />
        Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password…)
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <img
          src={enrollment.qr}
          alt="Scan with your authenticator app"
          className="h-40 w-40 shrink-0 rounded-lg border border-border bg-white p-2 sm:h-44 sm:w-44"
        />

        <div className="w-full min-w-0 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="totp-secret" className="text-xs text-muted-foreground">
              Manual entry code
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="totp-secret"
                readOnly
                value={enrollment.secret}
                className="min-w-0 flex-1 font-mono text-xs"
              />
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleCopySecret}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <form onSubmit={handleVerify} noValidate className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Enter the 6-digit code</Label>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <TotpInput
                  value={code}
                  onChange={(v) => setCode(v)}
                  disabled={verifying}
                  ariaLabel="Verification code"
                  containerClassName="w-full"
                />
                <Button type="submit" disabled={verifying || code.length !== 6} className="w-full shrink-0 sm:w-auto">
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verifyLabel}
                </Button>
              </div>
            </div>
            <p className="h-4 text-xs text-destructive" role={error ? "alert" : undefined}>
              {error ?? ""}
            </p>
          </form>
        </div>
      </div>

      {onCancel && (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={cancelDisabled} className="w-full sm:w-auto">
          Cancel
        </Button>
      )}
    </div>
  );
}
