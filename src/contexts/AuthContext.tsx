import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { AuthenticatorAssuranceLevels } from "@supabase/supabase-js";
import { amrFromToken, getAal, IMPERSONATION_KEY, isRecoveryIntent, listVerifiedTotpFactors, RECOVERY_KEY } from "@/lib/mfa";
import type { AalState, AmrClaim } from "@/lib/mfa";

/**
 * Shared authentication + MFA state.
 *
 * The role comes from the `user_roles` table (server-authoritative via RLS),
 * never from client-controlled storage. MFA state comes from Supabase Auth's
 * native factor list + Authenticator Assurance Level, so a client-side
 * "mfa done" flag can never fake a higher assurance level.
 */

/** Immutable snapshot of auth + MFA state, returned by `refresh()`. */
export interface AuthSnapshot {
  user: User | null;
  session: Session | null;
  role: string | null;
  isAdmin: boolean;
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
  hasVerifiedTotp: boolean;
  amr: AmrClaim[];
  /** Session came from a recovery magic link and hasn't reached AAL2 yet. */
  recoverySession: boolean;
  /** Session is an admin-initiated impersonation (TOTP is bypassed). */
  impersonating: boolean;
  mfaRequired: boolean;
}

interface AuthContextValue extends AuthSnapshot {
  loading: boolean;
  /** Re-read session, role, factors and AAL from Supabase. */
  refresh: () => Promise<AuthSnapshot>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * True while an admin is impersonating the current user. The marker is set in
 * sessionStorage when an admin opens an impersonation magic link
 * (`?impersonate=1`); it is only honored together with an `otp`-amr session,
 * so password/Google sign-ins can never inherit it. Server-side AAL2 checks
 * on admin edge functions still apply regardless of this client-side flag.
 */
function isImpersonatingSession(
  userId: string | undefined,
  methods: AmrClaim[],
): boolean {
  return (
    !!userId &&
    sessionStorage.getItem(IMPERSONATION_KEY) === userId &&
    methods.some((a) => a.method === "otp")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [nextLevel, setNextLevel] = useState<AuthenticatorAssuranceLevels | null>(null);
  const [hasVerifiedTotp, setHasVerifiedTotp] = useState(false);
  const [amr, setAmr] = useState<AmrClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const authInitialized = useRef(false);

  const amrOf = useCallback(
    (s: Session | null): AmrClaim[] => (s?.access_token ? amrFromToken(s.access_token) : []),
    [],
  );

  const loadAuthDetails = useCallback(async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const verified = await listVerifiedTotpFactors();
    const aal = await getAal();

    setRole(roleData?.role ?? null);
    setHasVerifiedTotp(verified.length > 0);
    setCurrentLevel(aal.currentLevel);
    setNextLevel(aal.nextLevel);
  }, []);

  const clearAuthDetails = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    sessionStorage.removeItem(RECOVERY_KEY);
    setRole(null);
    setHasVerifiedTotp(false);
    setCurrentLevel(null);
    setNextLevel(null);
    setAmr([]);
  }, []);

  const buildSnapshot = useCallback(
    (currentSession: Session | null, currentRole: string | null, verified: boolean, aal: AalState, methods: AmrClaim[]): AuthSnapshot => {
      const isAdminRole = currentRole === "admin" || currentRole === "coadmin";
      const impersonating = isImpersonatingSession(currentSession?.user?.id, methods);
      return {
        user: currentSession?.user ?? null,
        session: currentSession,
        role: currentRole,
        isAdmin: isAdminRole,
        currentLevel: aal.currentLevel,
        nextLevel: aal.nextLevel,
        hasVerifiedTotp: verified,
        amr: methods,
        recoverySession: impersonating
          ? false
          : isRecoveryIntent(currentSession?.user?.id, methods) && aal.currentLevel !== "aal2",
        impersonating,
        mfaRequired: impersonating
          ? false
          : !!currentSession?.user && isAdminRole && verified && aal.currentLevel !== "aal2",
      };
    },
    [],
  );

  const refresh = useCallback(async (): Promise<AuthSnapshot> => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    const userId = currentSession?.user?.id;
    const methods = amrOf(currentSession);

    let currentRole: string | null = null;
    let verified = false;
    let aal: AalState = { currentLevel: null, nextLevel: null };

    if (userId) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      currentRole = roleData?.role ?? null;

      verified = (await listVerifiedTotpFactors()).length > 0;
      aal = await getAal();
    }

    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setRole(currentRole);
    setHasVerifiedTotp(verified);
    setCurrentLevel(aal.currentLevel);
    setNextLevel(aal.nextLevel);
    setAmr(methods);

    return buildSnapshot(currentSession, currentRole, verified, aal, methods);
  }, [amrOf, buildSnapshot]);

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    let cancelled = false;

    // Detect an admin-initiated impersonation magic link (`?impersonate=1`) or
    // the explicit recovery magic link (`?recover=1`) and record them in this
    // tab, then remove the markers from the address bar. These URL params only
    // appear on the generated links themselves, so they pin down the
    // authentication intent — a plain login-page magic link carries neither.
    const urlParams = new URLSearchParams(window.location.search);
    const wantsImpersonation = urlParams.get("impersonate") === "1";
    const wantsRecovery = urlParams.get("recover") === "1";
    if (wantsImpersonation || wantsRecovery) {
      urlParams.delete("impersonate");
      urlParams.delete("recover");
      const qs = urlParams.toString();
      window.history.replaceState(
        {},
        "",
        qs ? `${window.location.pathname}?${qs}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`,
      );
    }
    const markImpersonation = (userId: string) => {
      if (wantsImpersonation) sessionStorage.setItem(IMPERSONATION_KEY, userId);
    };
    const markRecovery = (userId: string) => {
      if (wantsRecovery) sessionStorage.setItem(RECOVERY_KEY, userId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAmr(amrOf(newSession));
      if (newSession?.user) {
        markImpersonation(newSession.user.id);
        markRecovery(newSession.user.id);
        void loadAuthDetails(newSession.user.id);
      } else {
        sessionStorage.removeItem(IMPERSONATION_KEY);
        sessionStorage.removeItem(RECOVERY_KEY);
        clearAuthDetails();
      }
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAmr(amrOf(currentSession));
      if (currentSession?.user) {
        markImpersonation(currentSession.user.id);
        markRecovery(currentSession.user.id);
        await loadAuthDetails(currentSession.user.id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadAuthDetails, clearAuthDetails, amrOf]);

  const value = useMemo<AuthContextValue>(() => {
    const snapshot = buildSnapshot(session, role, hasVerifiedTotp, {
      currentLevel,
      nextLevel,
    }, amr);
    return {
      ...snapshot,
      loading,
      refresh,
    };
  }, [buildSnapshot, session, role, hasVerifiedTotp, currentLevel, nextLevel, amr, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
