import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Database, FileText, Activity, Share2, Lock, Clock, Eye, RefreshCw, Mail, Ban } from "lucide-react";

const sections = [
  {
    number: "01",
    icon: Database,
    title: "Information We Collect",
    content: (
      <>
        <p className="text-muted-foreground">When you use Scholar Share, we may collect information reasonably necessary to operate and improve the platform, including:</p>
        <ul className="mt-3 space-y-2">
          {[
            "Account information such as your name, email address, phone number, and school or institution name.",
            "Platform activity information such as login activity, uploads, downloads, requests, browser type, device information, and IP address.",
            "Content uploaded to the platform, including notes, documents, and preview images.",
            "Payment-related information such as transaction amounts, submitted payment confirmations, and contact details related to note requests.",
            "Teacher payment method information such as bank account details, IBANs, mobile wallet numbers, and account holder names associated with receiving payments.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "02",
    icon: FileText,
    title: "How We Use Information",
    content: (
      <ul className="space-y-2">
        {[
          "Provide, maintain, and improve platform features and services.",
          "Process note access requests and payment confirmation workflows.",
          "Send notifications, platform updates, reminders, and support messages.",
          "Monitor platform usage for security, fraud prevention, moderation, and policy compliance.",
          "Generate analytics, usage summaries, and revenue-related information for teachers and administrators.",
        ].map((item) => (
          <li key={item} className="flex gap-2.5 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    number: "03",
    icon: Activity,
    title: "Platform Activity & Security Monitoring",
    content: (
      <>
        <p className="text-muted-foreground">
          Certain platform activities may be logged for security, moderation, operational, and support purposes.
          These records may include login activity, uploads, downloads, profile updates, IP addresses, and device information.
        </p>
        <p className="mt-3 text-muted-foreground">Access to activity records is limited to:</p>
        <ul className="mt-2 space-y-2">
          {[
            "Authorized administrators for moderation, security, dispute resolution, and platform management purposes.",
            "Individual users for viewing their own account activity history where available.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "04",
    icon: Share2,
    title: "Data Sharing",
    content: (
      <>
        <p className="font-medium text-sm">We do not sell personal information.</p>
        <p className="mt-2 text-muted-foreground">
          Information may be shared only where reasonably necessary with:
        </p>
        <ul className="mt-2 space-y-2">
          {[
            "Teachers, for processing note requests, payment verification, and related communication.",
            "Authorized platform administrators, for moderation, support, compliance, security, and dispute resolution purposes.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "05",
    icon: Lock,
    title: "Administrative Account Access",
    content: (
      <>
        <p className="text-muted-foreground">
          In limited situations involving reported violations, unresolved disputes, fraud prevention, security concerns, or platform misuse,
          authorized administrators may use internal administrative tools to review relevant account content and activity where reasonably necessary.
        </p>
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1.5 text-muted-foreground">
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Does not expose or reveal user passwords to administrators.</span>
          </p>
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Is limited to authorized personnel only.</span>
          </p>
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Is used solely for moderation, investigation, compliance, support, or security purposes.</span>
          </p>
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Is logged internally for accountability and security monitoring.</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Administrative access is used only after reasonable attempts to resolve issues through standard communication or moderation procedures.
        </p>
      </>
    ),
  },
  {
    number: "06",
    icon: Clock,
    title: "Data Retention & Deletion",
    content: (
      <>
        <p className="text-muted-foreground mb-3">
          Account information and related platform data may be retained while an account remains active or as reasonably necessary
          for operational, security, moderation, legal, or compliance purposes.
        </p>
        <p className="text-sm font-medium mb-2">Note Deletion Lifecycle</p>
        <ul className="space-y-2 mb-3">
          {[
            "When a teacher deletes a note, it is moved to a soft-deleted (trash) state for 30 days, during which recovery may be possible.",
            "After 30 days, the note is automatically removed from user-accessible trash and can no longer be recovered by the user.",
            "For security and audit purposes, the deleted note data is retained internally within the system for an additional 15 days.",
            "After this 15-day internal retention period, all associated data is permanently erased from the system.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-medium mb-2">Account Deletion</p>
        <ul className="space-y-2">
          {[
            "When a user account is deleted, all associated content follows the same 30-day soft-delete window where recovery may be possible.",
            "After 30 days, the account and associated data enter a 15-day internal security retention period before being permanently erased.",
            "Activity logs may be retained for up to 90 days for security and audit purposes before being anonymized or deleted.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "07",
    icon: Eye,
    title: "User Rights",
    content: (
      <p className="text-muted-foreground">
        Users may request access to their information or request account-related data actions by contacting platform administration
        through available support or notification channels.
      </p>
    ),
  },
  {
    number: "08",
    icon: RefreshCw,
    title: "Policy Updates",
    content: (
      <p className="text-muted-foreground">
        This Privacy Policy may be updated periodically. Continued use of the platform after updates constitutes acceptance of the revised policy.
      </p>
    ),
  },
  {
    number: "09",
    icon: Ban,
    title: "Account Eligibility & Enforcement",
    content: (
      <>
        <p className="text-muted-foreground">
          Scholar Share accounts are intended <strong>for teachers only</strong>. Students, or any individual who is not an educator, 
          are <strong>not permitted</strong> to create or operate an account on this platform.
        </p>
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1.5">
          <p className="flex items-start gap-2 text-destructive font-medium">
            <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Any account found to belong to a student will be <strong>permanently deleted</strong> and the associated IP address will be <strong>banned</strong> from the platform.</span>
          </p>
        </div>
        <p className="mt-2 text-muted-foreground">
          Platform administrators reserve the right to investigate, restrict, or remove accounts and content that violate 
          this eligibility requirement, as outlined in the Terms & Conditions.
        </p>
      </>
    ),
  },
  {
    number: "10",
    icon: Mail,
    title: "Contact",
    content: (
      <p className="text-muted-foreground">
        For privacy or data-related concerns, users may contact platform administration through the in-app support or notification system.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container max-w-3xl px-4 py-10 sm:py-14">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
                <p className="text-xs text-muted-foreground">Last updated: June 19, 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-3xl px-4 py-8 space-y-6">
          {sections.map(({ number, icon: Icon, title, content }, i) => (
            <section
              key={number}
              className="group rounded-xl border bg-card p-5 sm:p-6 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-xs font-semibold text-primary/60">
                  {number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-sm">{title}</h2>
                  </div>
                  <div className="text-sm leading-relaxed">{content}</div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
