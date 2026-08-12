import { supabase } from "@/integrations/supabase/client";
import type { Factor, AuthenticatorAssuranceLevels } from "@supabase/supabase-js";

/**
 * Thin wrappers around Supabase Auth's native MFA/TOTP APIs.
 *
 * No TOTP secret/code is ever stored client-side or sent to our own servers.
 * We never log codes, secrets or factors.
 */

export type TotpFactor = Factor & { factor_type: "totp" };

export interface AalState {
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
}

/** All TOTP factors for the current user (any status). */
export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return data.totp as TotpFactor[];
}

/** TOTP factors that have been verified (active). */
export async function listVerifiedTotpFactors(): Promise<TotpFactor[]> {
  const factors = await listTotpFactors();
  return factors.filter((f) => f.status === "verified");
}

/** TOTP factors enrolled but not yet verified (abandoned enrollment). */
export async function listPendingTotpFactors(): Promise<TotpFactor[]> {
  const factors = await listTotpFactors();
  return factors.filter((f) => f.status === "unverified");
}

/** True when the user has at least one active (verified) TOTP factor. */
export async function hasVerifiedTotp(): Promise<boolean> {
  return (await listVerifiedTotpFactors()).length > 0;
}

/** Current and next Authenticator Assurance Level for the active session. */
export async function getAal(): Promise<AalState> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}

/** True when the session has not yet reached AAL2 (requires a TOTP code). */
export async function isMissingMfa(): Promise<boolean> {
  const { currentLevel } = await getAal();
  return currentLevel !== "aal2";
}

/** Start a new TOTP enrollment. The factor stays pending until verified. */
export async function enrollTotp(friendlyName?: string) {
  return supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
}

/** Remove a factor entirely (must already be at AAL2 to unenroll a verified one). */
export async function unenrollFactor(factorId: string) {
  return supabase.auth.mfa.unenroll({ factorId });
}

/** Create a new challenge for the given factor. */
export async function challengeFactor(factorId: string) {
  return supabase.auth.mfa.challenge({ factorId });
}

/** Verify a code against an open challenge. */
export async function verifyTotpCode(factorId: string, challengeId: string, code: string) {
  return supabase.auth.mfa.verify({ factorId, challengeId, code });
}

/** Challenge + verify in one step. */
export async function challengeAndVerifyTotp(factorId: string, code: string) {
  return supabase.auth.mfa.challengeAndVerify({ factorId, code });
}

/**
 * Send a single-use, expiring magic-link email for account recovery.
 * Uses Supabase's native OTP mechanism (no custom tokens, nothing stored).
 * The link's session is issued with `amr.method === "otp"` and lands on the
 * recovery page with `?recover=1`, so the app can tell this magic link apart
 * from a plain login-page magic link. Only this explicit recovery flow may
 * bypass the existing TOTP factor, since its purpose is to replace it.
 */
export async function sendRecoveryOtp(email: string, redirectTo: string) {
  const target = redirectTo.includes("?")
    ? `${redirectTo}&recover=1`
    : `${redirectTo}?recover=1`;
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: target,
    },
  });
}

/**
 * Fresh password re-authentication. Called on the recovery page so that a
 * merely-logged-in session is NOT enough to replace/disable TOTP.
 */
export async function reauthenticateWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Authentication Method Reference claim from a Supabase access-token JWT. */
export interface AmrClaim {
  method: string;
  timestamp?: number;
  provider?: string;
}

/** Decode the `amr` claim from a Supabase access-token JWT (never throws). */
export function amrFromToken(accessToken: string): AmrClaim[] {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return [];
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const raw = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(raw)) as { amr?: AmrClaim[] };
    return Array.isArray(claims.amr) ? claims.amr : [];
  } catch {
    return [];
  }
}

/** sessionStorage key marking an admin-initiated impersonation session. */
export const IMPERSONATION_KEY = "ss_impersonating";

/** sessionStorage key marking a session that came from the explicit recovery
 *  magic link (`?recover=1`), as opposed to a plain login-page magic link. */
export const RECOVERY_KEY = "ss_recovering";

/**
 * True only for a session that was created by the explicit lost-authenticator
 * recovery magic link. The marker is set in sessionStorage when the app loads
 * with `?recover=1` (only present on the recovery email's link) and it is
 * only honored together with an `otp`-amr session, so a plain login-page magic
 * link or a password/Google sign-in can never inherit it. This is the ONLY
 * flow allowed to bypass the existing TOTP factor.
 */
export function isRecoveryIntent(
  userId: string | undefined,
  methods: AmrClaim[],
): boolean {
  return (
    !!userId &&
    sessionStorage.getItem(RECOVERY_KEY) === userId &&
    methods.some((a) => a.method === "otp")
  );
}

/**
 * True while the current admin/coadmin session must still complete TOTP before
 * the privileged ARCHON / SQL-executor surfaces unlock. Mirrors the AuthContext
 * `mfaRequired` computation but reads everything from Supabase directly, so
 * the panels never depend on context timing and can never flash open for an
 * AAL1 admin. A magic-link (`otp`) sign-in is itself treated as the second
 * factor, so it is exempt. Server-side AAL2 checks on the edge functions remain
 * the real security boundary; this only controls what the UI shows.
 */
export async function isAdminMfaPending(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const methods = amrFromToken(session.access_token);
  if (methods.some((a) => a.method === "otp")) return false;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();
  const role = roleData?.role;
  if (role !== "admin" && role !== "coadmin") return false;

  const verified = (await listVerifiedTotpFactors()).length > 0;
  if (!verified) return false;

  const { currentLevel } = await getAal();
  return currentLevel !== "aal2";
}

/**
 * Begin a fresh TOTP enrollment, cleaning up any abandoned (unverified)
 * factors first so a new QR code is always accepted. Supabase requires a
 * unique friendly name per user, and during recovery the old (still-verified)
 * factor may already hold the default name — so the name is suffixed on a
 * conflict instead of failing. Returns the raw Supabase enroll result.
 */
export async function startTotpEnrollment(friendlyName = "Scholar Share") {
  const pending = await listPendingTotpFactors();
  for (const p of pending) {
    const { error } = await unenrollFactor(p.id);
    if (error) {
      // Stale unverified factor could not be removed; still try to enroll.
      console.warn("Could not clean up stale MFA factor:", error.code);
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await enrollTotp(
      attempt === 0 ? friendlyName : `${friendlyName} ${attempt + 1}`,
    );
    if (!error || error.code !== "mfa_factor_name_conflict") return { data, error };
  }

  // Guaranteed-unique fallback (timestamped) if the numbered names all clash.
  return enrollTotp(`${friendlyName} ${Date.now()}`);
}

/**
 * Remove every verified TOTP factor except `keepId`.
 * Returns an error message, or null on success. Only call AFTER the new
 * factor has been verified (session at AAL2), so the old factor stays
 * active until the new one is confirmed — no lockout window.
 */
export async function removeVerifiedTotpExcept(keepId: string): Promise<string | null> {
  const verified = await listVerifiedTotpFactors();
  for (const factor of verified) {
    if (factor.id === keepId) continue;
    const { error } = await unenrollFactor(factor.id);
    if (error) return mfaErrorMessage(error);
  }
  return null;
}

/**
 * Ask the server-side `reset-mfa` edge function to remove all verified TOTP
 * factors for the current user. This is the ONLY way to recover a lost
 * authenticator: GoTrue blocks both enrolling a new factor and unenrolling a
 * verified one below AAL2, so the old factor must be removed server-side
 * after the caller proves fresh primary auth (magic-link `otp` session or a
 * password sign-in within the last 15 minutes) — enforced from the JWT in
 * the edge function, never trusted client-side.
 *
 * Returns an error message, or null on success.
 */
export async function resetMfaFactors(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return "You must be signed in to recover two-factor authentication.";
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-mfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const result = await res.json();
    return result?.error ?? null;
  } catch {
    return "Could not reach the recovery service. Please try again.";
  }
}

/**
 * Render the Supabase QR payload as a usable <img> src.
 * GoTrue returns a raw SVG string; handle a pre-encoded data URI too.
 */
export function qrCodeSrc(qr: string): string {
  if (qr.startsWith("data:")) return qr;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`;
}

/** Friendly, non-sensitive message for a given Supabase error. */
export function mfaErrorMessage(error: { code?: string; message?: string; status?: number } | null): string {
  if (!error) return "Something went wrong. Please try again.";

  switch (error.code) {
    case "mfa_verification_failed":
    case "mfa_challenge_verification_rejected":
      return "The code you entered is incorrect. Please try again.";
    case "mfa_challenge_expired":
      return "That verification expired. Please try again.";
    case "mfa_factor_not_found":
      return "The authenticator factor was not found. Please refresh and try again.";
    case "mfa_factors_limit_exceeded":
      return "Too many authenticator factors. Remove an unused one before adding another.";
    case "user_already_has_factor":
      return "Two-factor authentication is already set up for this account.";
    case "mfa_factor_name_conflict":
      return "A factor with that name already exists.";
    case "session_expired":
      return "Your session expired. Please sign in again.";
    case "insufficient_aal":
      return "Re-enter your authenticator code to confirm.";
    case "rate_limit_exceeded":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      if (error.status === 403 || error.status === 401) {
        return "You are not authorized to do that. Please sign in again.";
      }
      return "Something went wrong. Please try again.";
  }
}

