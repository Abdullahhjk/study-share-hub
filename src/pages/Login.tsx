import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { BookOpen, Mail, ArrowLeft, GraduationCap, Shield, AlertTriangle, EyeOff, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ActivityLogger } from "@/hooks/useActivityLogger";
import React from "react";

/* ─── Schemas ─────────────────────────────────────────────────────────────── */

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  teacherConfirm: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are a teacher." }),
  }),
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;
type EmailData = z.infer<typeof emailSchema>;
type ViewType = "auth" | "forgot-password" | "magic-link";

/* ─── Constants ───────────────────────────────────────────────────────────── */

// Locked dimensions — nothing on this page ever changes these.
const CARD_MAX_W = "max-w-4xl";
const SIDE_CARD_MAX_W = "max-w-md";
// Right panel pane container: tall enough for signup (the taller pane).
const PANE_MIN_H = 420;

/* ─── Tiny helpers ────────────────────────────────────────────────────────── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 py-12">
      {children}
    </div>
  );
}

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ id, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        ref={ref}
        type={show ? "text" : "password"}
        className="pr-10"
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {/* Reserve space so errors don't shift layout — always 16px tall */}
      <p className="h-4 text-xs text-destructive" role={error ? "alert" : undefined}>
        {error ?? ""}
      </p>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      {icon}
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="outline" className="w-full gap-2" onClick={onClick} disabled={disabled}>
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Continue with Google
    </Button>
  );
}

function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${compact ? "mb-4" : "mb-6"}`}>
      <Link
        to="/"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm ring-1 ring-primary/20 transition-transform hover:scale-105"
        aria-label="Scholar Share home"
      >
        <img src="/preview.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
      </Link>
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">Scholar Share</h1>
        {!compact && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            The marketplace for educator-authored notes
          </p>
        )}
      </div>
    </div>
  );
}

function TeacherNotice() {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="leading-relaxed text-foreground">
        This platform is for <strong className="font-semibold">teachers</strong> to upload and sell
        notes. Students must <strong className="font-semibold text-destructive">NOT</strong> create
        an account. Any student account found will be{" "}
        <strong className="font-semibold text-destructive">permanently deleted</strong> and the
        student's IP will be{" "}
        <strong className="font-semibold text-destructive">banned</strong>.
      </p>
    </div>
  );
}

/* ─── Reusable email-only form (forgot-password & magic-link) ─────────────── */

function EmailOnlyView({
  title,
  description,
  submitLabel,
  onSubmit,
  onBack,
  isLoading,
  form,
}: {
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (data: EmailData) => void;
  onBack: () => void;
  isLoading: boolean;
  form: ReturnType<typeof useForm<EmailData>>;
}) {
  return (
    <PageShell>
      <Card className={`w-full ${SIDE_CARD_MAX_W} rounded-2xl shadow-sm`}>
        <div className="p-8">
          <BrandHeader compact />
          <h2 className="mb-1 text-center text-xl font-semibold">{title}</h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">{description}</p>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Field id="email-input" label="Email" error={form.formState.errors.email?.message}>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="you@school.edu"
                  autoComplete="email"
                  {...form.register("email")}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {submitLabel}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </PageShell>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [oAuthLoading, setOAuthLoading] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("auth");
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) });
  const emailForm = useForm<EmailData>({ resolver: zodResolver(emailSchema) });

  /* ── Handlers ── */

  const handleLogin = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) throw error;
      ActivityLogger.login();
      navigate("/");
      window.location.reload();
    } catch {
      toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: data.fullName } },
      });
      if (error) throw error;
      ActivityLogger.signup();
      toast({ title: "Account created!", description: "Verify your email, then sign in to your teacher dashboard." });
      navigate("/dashboard");
    } catch {
      toast({ title: "Signup failed", description: "Could not create account. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (data: EmailData) => {
    setIsLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } finally {
      toast({ title: "If that email is registered, a password reset link has been sent." });
      setView("auth");
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (data: EmailData) => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email: data.email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
    } finally {
      toast({ title: "If that email is registered, a magic link has been sent." });
      setView("auth");
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google") => {
    setOAuthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "OAuth login failed", description: error.message || "Could not sign in with Google.", variant: "destructive" });
      setOAuthLoading(null);
    }
  };

  /* ── Secondary views ── */

  if (view === "forgot-password") {
    return (
      <EmailOnlyView
        title="Reset your password"
        description="Enter your email and we'll send a reset link."
        submitLabel="Send reset link"
        onSubmit={handlePasswordReset}
        onBack={() => setView("auth")}
        isLoading={isLoading}
        form={emailForm}
      />
    );
  }

  if (view === "magic-link") {
    return (
      <EmailOnlyView
        title="Sign in with a magic link"
        description="No password needed — we'll email you a one-click link."
        submitLabel="Send magic link"
        onSubmit={handleMagicLink}
        onBack={() => setView("auth")}
        isLoading={isLoading}
        form={emailForm}
      />
    );
  }

  /* ── Main auth view ── */

  return (
    <PageShell>
      <div className={`w-full ${CARD_MAX_W} space-y-4`}>

        <TeacherNotice />

        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* ── Left: branding + OAuth ── */}
            <div className="flex flex-col justify-between gap-6 border-b p-8 md:border-b-0 md:border-r">
              <BrandHeader />

              <div className="space-y-3">
                <TrustBadge icon={<GraduationCap className="h-4 w-4 text-primary" />} text="Built exclusively for educators" />
                <TrustBadge icon={<Shield className="h-4 w-4 text-primary" />} text="Verified teacher accounts only" />
                <TrustBadge icon={<BookOpen className="h-4 w-4 text-primary" />} text="Sell notes. Earn passively." />
              </div>

              <div>
                <p className="mb-3 text-center text-xs uppercase tracking-wide text-muted-foreground">
                  Quick access
                </p>
                <GoogleButton onClick={() => handleOAuth("google")} disabled={!!oAuthLoading} />
              </div>
            </div>

            {/* ── Right: tab switcher + fixed-height pane container ── */}
            <div className="p-8">

              {/* Tab bar — purely cosmetic switcher, does NOT mount/unmount content */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "login" | "signup")}
                className="w-full"
              >
                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
              </Tabs>

              {/*
                FIXED-HEIGHT CONTAINER.
                Both panes live here simultaneously. The active one is
                position:relative (drives height). The inactive one is
                position:absolute (takes zero layout space) + visibility:hidden
                (invisible, non-interactive, but still painted so its height
                is always known — no reflow on tab switch).
                minHeight = height of the taller pane (signup) so the card
                never shrinks when switching to the shorter pane (login).
              */}
              <div className="relative" style={{ minHeight: PANE_MIN_H }}>

                {/* LOGIN pane */}
                <div
                  aria-hidden={activeTab !== "login"}
                  style={{
                    position: activeTab === "login" ? "relative" : "absolute",
                    visibility: activeTab === "login" ? "visible" : "hidden",
                    pointerEvents: activeTab === "login" ? "auto" : "none",
                    inset: activeTab === "login" ? undefined : "0 0 auto 0",
                    width: "100%",
                  }}
                >
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
                    <div className="space-y-1">
                      <Field id="login-email" label="Email" error={loginForm.formState.errors.email?.message}>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@school.edu"
                          autoComplete="email"
                          tabIndex={activeTab === "login" ? 0 : -1}
                          {...loginForm.register("email")}
                        />
                      </Field>

                      <Field id="login-password" label="Password" error={loginForm.formState.errors.password?.message}>
                        <PasswordInput
                          id="login-password"
                          autoComplete="current-password"
                          tabIndex={activeTab === "login" ? 0 : -1}
                          {...loginForm.register("password")}
                        />
                      </Field>

                      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                        <button
                          type="button"
                          tabIndex={activeTab === "login" ? 0 : -1}
                          className="transition-colors hover:text-foreground hover:underline underline-offset-2"
                          onClick={() => setView("forgot-password")}
                        >
                          Forgot password?
                        </button>
                        <button
                          type="button"
                          tabIndex={activeTab === "login" ? 0 : -1}
                          className="transition-colors hover:text-foreground hover:underline underline-offset-2"
                          onClick={() => setView("magic-link")}
                        >
                          Use magic link
                        </button>
                      </div>

                      <div className="pt-2">
                        <Button type="submit" className="w-full" disabled={isLoading} tabIndex={activeTab === "login" ? 0 : -1}>
                          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />}
                          Sign in
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* SIGNUP pane */}
                <div
                  aria-hidden={activeTab !== "signup"}
                  style={{
                    position: activeTab === "signup" ? "relative" : "absolute",
                    visibility: activeTab === "signup" ? "visible" : "hidden",
                    pointerEvents: activeTab === "signup" ? "auto" : "none",
                    inset: activeTab === "signup" ? undefined : "0 0 auto 0",
                    width: "100%",
                  }}
                >
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} noValidate>
                    <div className="space-y-1">
                      <Field id="signup-name" label="Full name" error={signupForm.formState.errors.fullName?.message}>
                        <Input
                          id="signup-name"
                          placeholder="Dr. Jane Smith"
                          autoComplete="name"
                          tabIndex={activeTab === "signup" ? 0 : -1}
                          {...signupForm.register("fullName")}
                        />
                      </Field>

                      <Field id="signup-email" label="Email" error={signupForm.formState.errors.email?.message}>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@school.edu"
                          autoComplete="email"
                          tabIndex={activeTab === "signup" ? 0 : -1}
                          {...signupForm.register("email")}
                        />
                      </Field>

                      <Field id="signup-password" label="Password" error={signupForm.formState.errors.password?.message}>
                        <PasswordInput
                          id="signup-password"
                          autoComplete="new-password"
                          tabIndex={activeTab === "signup" ? 0 : -1}
                          {...signupForm.register("password")}
                        />
                      </Field>

                      {/* Teacher confirmation */}
                      <div className={`flex items-start gap-2.5 rounded-lg border bg-muted/40 px-3 py-3 ${signupForm.formState.errors.teacherConfirm ? "border-destructive" : "border-border"
                        }`}>
                        <input
                          id="teacher-confirm"
                          type="checkbox"
                          tabIndex={activeTab === "signup" ? 0 : -1}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                          {...signupForm.register("teacherConfirm")}
                        />
                        <Label htmlFor="teacher-confirm" className="cursor-pointer text-sm leading-snug text-muted-foreground">
                          I confirm I am a <strong className="text-foreground">qualified teacher</strong>.{" "}
                          I understand student accounts are{" "}
                          <strong className="text-destructive">permanently banned</strong>.
                        </Label>
                      </div>
                      {/* Reserve fixed space for checkbox error */}
                      <p className="h-4 text-xs text-destructive" role={signupForm.formState.errors.teacherConfirm ? "alert" : undefined}>
                        {signupForm.formState.errors.teacherConfirm?.message ?? ""}
                      </p>

                      <div className="pt-1">
                        <Button type="submit" className="w-full" disabled={isLoading} tabIndex={activeTab === "signup" ? 0 : -1}>
                          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />}
                          Create teacher account
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>

              </div>
            </div>

          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <Link to="/privacy" className="text-primary underline-offset-2 hover:underline">Privacy Policy</Link>
          {" "}and{" "}
          <Link to="/terms" className="text-primary underline-offset-2 hover:underline">Terms &amp; Conditions</Link>.
        </p>

      </div>
    </PageShell>
  );
}