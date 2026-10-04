import { useState } from "react";
import { Link } from "react-router-dom";
import { VERSION, UPDATE_TIME } from "../../version";
import { CODEBASE_INFO } from "../../codebase-info";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Mail, MessageSquare, Send, Loader2, ChevronDown } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

function getTimeAgo(date: Date) {
  const now = Date.now();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "unknown";
  const updated = d.getTime();
  const diffMs = Math.max(0, now - updated);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} Day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} Minute${minutes === 1 ? "" : "s"}`);

  if (parts.length === 0) return "Just now";

  if (parts.length === 1) return `${parts[0]} ago`;

  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)} ago`;
}

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Orders", href: "/my-orders" },
  { label: "Help", href: "/help" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Upcoming", href: "/upcoming" },
];

// Mobile keeps only the navigational essentials visible; the rest collapse
// behind the "More" disclosure so the footer stays short on small screens.
const primaryFooterPaths = ["/dashboard", "/my-orders", "/help"];

const primaryFooterLinks = footerLinks.filter((link) =>
  primaryFooterPaths.includes(link.href)
);

const secondaryFooterLinks = footerLinks.filter(
  (link) => !primaryFooterPaths.includes(link.href)
);

export function Footer() {
  const updatedDate = new Date(UPDATE_TIME);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: cleanEmail });
      if (error) {
        if (
          error.code === "23505" || // Postgres unique violation
          /duplicate/i.test(error.message)
        ) {
          toast("Already subscribed", {
            description: "You're already on our newsletter list.",
          });
          console.clear()
          return;
        }

        throw error;
      }

      toast.success("Subscribed!", {
        description: "You'll receive update notices.",
      });

      setEmail("");
    } catch (err: any) {
      toast.error("Subscription failed", {
        description: err.message || "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackEmail.trim() || !feedbackMessage.trim()) {
      toast.error("Missing fields", {
        description: "Please fill in both email and message.",
      });
      return;
    }

    setFeedbackSubmitting(true);

    try {
      const { error } = await supabase
        .from("feedback")
        .insert({
          email: feedbackEmail.trim().toLowerCase(),
          message: feedbackMessage.trim()
        });

      if (error) throw error;

      toast.success("Feedback sent!", {
        description: "Thank you for your feedback.",
      });

      setFeedbackEmail("");
      setFeedbackMessage("");
      setFeedbackDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to send feedback", {
        description: message,
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <footer className="border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container py-4 md:py-6">
        <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex w-fit items-center gap-3">
              <img src="/preview.png" alt="Logo" className="h-9 w-9 rounded-xl border object-cover shadow-sm md:h-11 md:w-11" />
              <div>
                <p className="font-display text-base font-semibold tracking-tight text-foreground md:text-lg">Scholar Share</p>
                <p className="text-xs text-muted-foreground">Share notes. Build mastery.</p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border bg-muted px-2 py-1 font-medium text-foreground">{VERSION}</span>
              <span className="text-muted-foreground">Updated {getTimeAgo(updatedDate)}</span>
            </div>
          </div>

          <div className="hidden max-w-3xl flex-wrap items-center justify-start gap-2 md:flex lg:justify-end">
            {footerLinks.map((link) => (
              <Link key={link.href} to={link.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex flex-wrap items-center gap-1">
              {primaryFooterLinks.map((link) => (
                <Link key={link.href} to={link.href}
                  className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </div>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                More
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>

              <div className="absolute bottom-full right-0 z-20 mb-1 w-40 overflow-hidden rounded-lg border bg-popover p-1 shadow-md">
                {secondaryFooterLinks.map((link) => (
                  <Link key={link.href} to={link.href}
                    className="block rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border bg-muted/20 p-4 md:mt-8 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">

            <div className="max-w-xl space-y-2">
              <h2 className="text-base font-semibold tracking-tight md:text-lg">
                Stay Connected with us!
              </h2>

              <p className="hidden text-sm leading-relaxed text-muted-foreground md:block">
                Subscribe for new updates or send feedback to help improve the app experience.
              </p>
            </div>

            <Dialog
              open={feedbackDialogOpen}
              onOpenChange={setFeedbackDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Stay Connected
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader className="space-y-2">
                  <DialogTitle>
                    Stay Connected
                  </DialogTitle>

                  <DialogDescription>
                    Subscribe for updates or send feedback.
                  </DialogDescription>
                </DialogHeader>

                <Tabs
                  defaultValue="subscribe"
                  className="mt-4 w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="subscribe"
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Subscribe
                    </TabsTrigger>

                    <TabsTrigger
                      value="feedback"
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Feedback
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="subscribe"
                    className="mt-5"
                  >
                    <form
                      onSubmit={subscribe}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="subscribe-email">
                          Email Address
                        </Label>

                        <Input
                          id="subscribe-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) =>
                            setEmail(e.target.value)
                          }
                          placeholder="you@example.com"
                        />

                        <p className="text-xs text-muted-foreground">
                          Receive an email when a new build ships.
                        </p>
                      </div>

                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full"
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />

                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}

                          {submitting
                            ? "Subscribing..."
                            : "Subscribe"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </TabsContent>

                  <TabsContent
                    value="feedback"
                    className="mt-5"
                  >
                    <form
                      onSubmit={submitFeedback}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="feedback-email">
                          Email Address
                        </Label>

                        <Input
                          id="feedback-email"
                          type="email"
                          required
                          value={feedbackEmail}
                          onChange={(e) =>
                            setFeedbackEmail(e.target.value)
                          }
                          placeholder="you@example.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback-message">
                          Message
                        </Label>

                        <Textarea
                          id="feedback-message"
                          required
                          value={feedbackMessage}
                          onChange={(e) =>
                            setFeedbackMessage(e.target.value)
                          }
                          placeholder="Share your thoughts, suggestions, or issues..."
                          className="min-h-[140px] resize-none"
                        />
                      </div>

                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={feedbackSubmitting}
                          className="w-full"
                        >
                          {feedbackSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}

                          {feedbackSubmitting
                            ? "Sending..."
                            : "Send Feedback"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t pt-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} M. Abdullah Waqas. All rights reserved.
          </p>

          <p className="hidden text-xs text-muted-foreground md:block">
            Built with React, TypeScript, TailwindCSS and Vite.
          </p>

          <p className="hidden text-xs text-muted-foreground md:block">
            {CODEBASE_INFO.files} custom files • {CODEBASE_INFO.lines} lines written • {CODEBASE_INFO.chars} characters
          </p>
        </div>
      </div>
    </footer>
  );
}