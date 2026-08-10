import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "coadmin";
  fallbackPath?: string;
}

export default function ProtectedRoute({ children, requiredRole, fallbackPath = "/login" }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await refresh();
      if (cancelled) return;

      if (!snapshot.user) {
        setAuthorized(false);
        navigate(fallbackPath, { replace: true });
        return;
      }

      if (requiredRole === "admin" || requiredRole === "coadmin") {
        if (snapshot.role !== "admin" && snapshot.role !== "coadmin") {
          setAuthorized(false);
          navigate("/dashboard", { replace: true });
          return;
        }
      }

      if (snapshot.mfaRequired) {
        // A recovery session (magic-link) can't enter a TOTP code; it must
        // finish replacing the authenticator on the recovery page.
        if (snapshot.recoverySession) {
          setAuthorized(false);
          navigate("/mfa/recover", { replace: true });
          return;
        }
        const next = encodeURIComponent(location.pathname + location.search);
        setAuthorized(false);
        navigate(`/mfa/verify?next=${next}`, { replace: true });
        return;
      }

      setAuthorized(true);
    })();

    return () => { cancelled = true; };
    // refresh is stable across renders; location changes re-run the gate.
  }, [requiredRole, fallbackPath, navigate, location.pathname, location.search, refresh]);

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
