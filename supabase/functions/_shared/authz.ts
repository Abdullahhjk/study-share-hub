// Shared authorization helpers for admin edge functions.
//
// The Supabase access-token JWT carries an `aal` claim set by GoTrue
// ("aal1" after primary auth, "aal2" after a factor was verified for this
// session). Reading it server-side is the only reliable way to require MFA:
// a client-side flag can never prove the user completed the TOTP challenge.

export type Aal = "aal1" | "aal2";

/** Best-effort decode of the JWT payload segment. Never throws. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const raw = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Read the `aal` claim from a `Bearer <token>` authorization header. */
export function aalFromAuthHeader(authHeader: string): Aal {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const claims = decodeJwtPayload(token);
  return claims?.aal === "aal2" ? "aal2" : "aal1";
}

/**
 * Throw unless the caller's current session is at AAL2 (MFA completed).
 * Call after confirming the caller is an admin/coadmin.
 */
export function requireAal2(aal: Aal): void {
  if (aal !== "aal2") {
    throw new Error("Two-factor authentication required");
  }
}
