/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom";
import {
  LogIn,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  ShoppingBag,
  Menu,
  LockKeyhole,
  HelpCircle,
  Shield,
  FolderLock,
  Bell,
  Crown,
  Settings,
  ChevronDown,
  GraduationCap,
  BadgeCheck,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import { CURRENCY_STORAGE_KEY, SHOW_DROPDOWN_KEY, CURRENCY_EVENT, dispatchCurrencyEvent, currencyConfigs } from "@/lib/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RequestTracker } from "./dashboard/RequestTracker";
import { SettingsDialog } from "./settings/SettingsDialog";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verified_at: string;
};

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_STORAGE_KEY) ?? "PKR");
  const [showDropdown, setShowDropdown] = useState(() => localStorage.getItem(SHOW_DROPDOWN_KEY) === "true");
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["header-unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq("is_read", false)
        .eq("is_dismissed", false);
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: newsletterSub = null } = useQuery({
    queryKey: ["header-newsletter-subscribed", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase
        .from("newsletter_subscribers")
        .select("id, is_active")
        .eq("email", user.email)
        .maybeSingle();
      return data as { id: string; is_active: boolean } | null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    supabase
      .from("profiles")
      .select("full_name, avatar_url, is_verified, verified_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as unknown as Profile);
      });

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const role = data?.role;
        setIsAdmin(role === "admin" || role === "coadmin");
        setUserRole(role || null);
      });
  }, [user]);

  useEffect(() => {
    const handleCurrencyChange = () => {
      setCurrency(localStorage.getItem(CURRENCY_STORAGE_KEY) ?? "PKR");
      setShowDropdown(localStorage.getItem(SHOW_DROPDOWN_KEY) === "true");
    };

    window.addEventListener(CURRENCY_EVENT, handleCurrencyChange);
    window.addEventListener("storage", handleCurrencyChange);

    return () => {
      window.removeEventListener(CURRENCY_EVENT, handleCurrencyChange);
      window.removeEventListener("storage", handleCurrencyChange);
    };
  }, []);

  const handleCurrencySelect = (code: string, config: any) => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    toast.success("Currency updated", {
      id: "currency-toast",
      description: `${config.label} (${code}) is now active for all pricing`,
    });
    setCurrency(code);
    dispatchCurrencyEvent();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload();
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-1 px-2 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/preview.png" alt="Logo" className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg" />
          <span className="hidden sm:inline font-display text-lg font-semibold">
            Scholar Share
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {!user && <div><RequestTracker /></div>}
          {(!user || showDropdown) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 sm:h-10 w-auto min-w-0 sm:w-[11rem] px-1.5 sm:px-2 flex items-center justify-between gap-1 text-xs sm:text-sm font-medium"
                  title={`Currency: ${currency}`}
                >
                  <span className="flex items-center gap-1 sm:gap-2 truncate">
                    <span className="w-5 sm:w-6 shrink-0 text-center text-muted-foreground">
                      {currencyConfigs[currency].symbol}
                    </span>
                    <span className="hidden sm:inline flex-1 truncate">
                      {currencyConfigs[currency].label}
                    </span>
                    <span className="sm:hidden font-semibold uppercase">
                      {currency}
                    </span>
                  </span>

                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-[11rem] p-1"
                sideOffset={6}
              >
                {Object.entries(currencyConfigs).map(([code, config]) => {
                  const isActive = code === currency;

                  return (
                    <DropdownMenuItem
                      key={code}
                      onSelect={() => handleCurrencySelect(code, config)}
                      className={[
                        "h-10 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        "cursor-pointer select-none outline-none transition-colors",
                        "focus:bg-accent focus:text-accent-foreground",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted",
                      ].join(" ")}
                    >
                      <span className="w-6 text-center text-muted-foreground">
                        {config.symbol}
                      </span>

                      <span className="flex-1 truncate">
                        {config.label}
                      </span>

                      <span className="w-4 text-right text-xs font-semibold">
                        {isActive ? "✓" : ""}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 relative"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 relative ${menuOpen && user && unreadCount > 0 ? "ring-2 ring-destructive" : ""}`}
              >
                <Menu className="h-4 w-4" />
                {user && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      to={'/dashboard/?tab=settings'}
                      className="flex items-center gap-3 px-2 py-2 h-auto w-full justify-start hover:bg-primary"
                    >
                      {profile?.avatar_url ? (
                        <div className="relative">
                          <img
                            src={profile.avatar_url}
                            alt="Profile"
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          {(profile.is_verified) &&
                            profile.is_verified && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 shadow-sm">
                                    <BadgeCheck
                                      className="h-1 w-1 sm:h-2 sm:w-2 text-success"
                                      aria-label="Verified teacher"
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">You are a verified teacher. Verified at: {new Date(profile.verified_at).toLocaleString()}</TooltipContent>
                              </Tooltip>
                            )}
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                          {(profile?.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium">
                          {profile?.full_name ?? "User"}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>

                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 mt-1 text-blue-600 dark:text-blue-400">
                                  <Badge variant="secondary" title={userRole === "coadmin" ? "You are a Co-Administrator" : userRole === "admin" ? "You are an Administrator" : "You are a Teacher"} className={`text-center w-fit mx-auto font-semibold flex items-center gap-1.5 mt-1 ${userRole === "coadmin" ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" : userRole === "admin" ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" : "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"}`}>
                                    {userRole === "coadmin" ? <Shield className="h-3.5 w-3.5" /> : userRole === "admin" ? <Crown className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                                    {userRole === "coadmin" ? "Co-Admin" : userRole === "admin" ? "Administrator" : "Teacher"}
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {userRole === "coadmin" ? "You are a Co-Administrator" : userRole === "admin" ? "You are an Administrator" : "You are a Teacher"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {newsletterSub && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 mt-1 text-blue-600 dark:text-blue-400">
                                    <Bell className={`h-3.5 w-3.5 ${newsletterSub.is_active ? "animate-shake" : ""}`} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{newsletterSub.is_active ? "You are subscribed for receiving newsletters" : "You are subscribed but would not receive newsletters"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                      </div>

                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {!user && (
                <DropdownMenuItem asChild>
                  <Link to="/my-orders" className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    My Orders
                  </Link>
                </DropdownMenuItem>
              )}
              {user && (
                <DropdownMenuItem asChild>
                  <Link
                    to="/reset-password"
                    className="flex items-center gap-2"
                  >
                    <LockKeyhole className="h-4 w-4" />
                    Reset Password
                  </Link>
                </DropdownMenuItem>
              )}

              {user && (
                <DropdownMenuItem asChild>
                  <Link to={userRole === "coadmin" ? "/coadmin" : "/dashboard/?tab=notes"} className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {userRole === "coadmin" ? "Co-Admin Panel" : "Dashboard"}
                  </Link>
                </DropdownMenuItem>
              )}

              {user && (
                <DropdownMenuItem asChild>
                  <Link to="/database-data" className="flex items-center gap-2">
                    <FolderLock className="h-4 w-4" />
                    Your Data
                  </Link>
                </DropdownMenuItem>
              )}

              {user && isAdmin && userRole === "admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </DropdownMenuItem>
              )}

              {user && userRole === "admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/system-blueprint" className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    System Blueprint
                  </Link>
                </DropdownMenuItem>
              )}

              {user && (
                <DropdownMenuItem asChild>
                  <Link
                    to={userRole === "coadmin" ? "/coadmin?tab=notifications" : isAdmin ? "/admin?tab=notifications" : "/dashboard?tab=notifications"}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link to="/help" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Help & Guide
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {user ? (
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Teacher Login
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <span className="block text-center p-2 border-t text-sm font-medium text-muted-foreground">
        Multiple notes from the same teacher allowed; only one teacher per request.
      </span>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
      />
    </header>
  );
}
