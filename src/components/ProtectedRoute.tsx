import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "coadmin";
  fallbackPath?: string;
}

export default function ProtectedRoute({ children, requiredRole, fallbackPath = "/login" }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) { setAuthorized(false); navigate(fallbackPath, { replace: true }); }
        return;
      }

      if (requiredRole === "admin" || requiredRole === "coadmin") {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .in("role", ["admin", "coadmin"])
          .maybeSingle();

        if (!roleData) {
          if (!cancelled) { setAuthorized(false); navigate("/dashboard", { replace: true }); }
          return;
        }
      }

      if (!cancelled) setAuthorized(true);
    }

    check();
    return () => { cancelled = true; };
  }, [navigate, requiredRole, fallbackPath]);

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
