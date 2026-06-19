import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle, User, DollarSign, Shield, Flag, Lock, AlertTriangle, RefreshCw, Ban } from "lucide-react";

const sections = [
  {
    number: "01",
    icon: CheckCircle,
    title: "Acceptance of Terms",
    content: (
      <p className="text-muted-foreground">
        By creating an account or using Scholar Share, you agree to comply with these Terms and Conditions.
        If you do not agree, you should discontinue use of the platform.
      </p>
    ),
  },
  {
    number: "02",
    icon: User,
    title: "User Accounts & Eligibility",
    content: (
      <>
        <ul className="space-y-2">
          {[
            "Accounts are strictly for teachers only. Students are not permitted to create or operate an account.",
            "Users must provide reasonably accurate and current information during registration.",
            "Teacher accounts may require administrative review or approval before gaining access to certain platform features.",
            "Users are responsible for maintaining the confidentiality of their account credentials and activity associated with their account.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1.5">
          <p className="flex items-start gap-2 text-destructive font-medium">
            <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Any account found to belong to a student will be <strong>permanently deleted</strong> and the associated IP address will be <strong>banned</strong> from the platform.</span>
          </p>
        </div>
      </>
    ),
  },
  {
    number: "03",
    icon: FileText,
    title: "Content & Conduct",
    content: (
      <ul className="space-y-2">
        {[
          "Teachers are responsible for the content they upload or share through the platform.",
          "Uploaded content must not violate applicable copyright, intellectual property, or legal rights.",
          "Users must not upload unlawful, misleading, harmful, offensive, or inappropriate material.",
          "Users may report content believed to violate platform policies through available reporting features.",
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
    number: "04",
    icon: DollarSign,
    title: "Payments & Pricing",
    content: (
      <ul className="space-y-2">
        {[
          "Teachers may set pricing for premium notes or educational materials.",
          "Teachers must provide accurate bank account or mobile wallet details for receiving payments; the platform is not responsible for errors in teacher-provided payment information.",
          "The platform may apply a service fee to transactions conducted through the platform.",
          "Payment confirmation information submitted by users may be reviewed for moderation, verification, or dispute-resolution purposes.",
          "Refund requests and payment disputes may be reviewed with administrative oversight where necessary.",
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
    number: "05",
    icon: Shield,
    title: "Platform Administration & Enforcement",
    content: (
      <>
        <p className="text-muted-foreground">
          Authorized administrators may take reasonable actions necessary to protect platform integrity, users, and compliance with these terms, including:
        </p>
        <ul className="mt-2 space-y-2">
          {[
            "Reviewing reported content or platform activity.",
            "Restricting, suspending, or removing accounts that violate platform policies or applicable laws.",
            "Removing content that violates these Terms.",
            "Reviewing relevant activity records for moderation, fraud prevention, support, security, or dispute-resolution purposes.",
            "Managing user roles, approvals, or account permissions.",
            "Issuing warnings or notices before escalated enforcement actions where appropriate.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              In cases involving repeated, serious, or unresolved violations, the platform may restrict or permanently
              remove access to affected accounts or content.
            </span>
          </p>
        </div>
      </>
    ),
  },
  {
    number: "06",
    icon: Flag,
    title: "Reports, Appeals & Disputes",
    content: (
      <ul className="space-y-2">
        {[
          "Users may report content or conduct believed to violate platform policies.",
          "Administrators may review reports and take actions considered reasonably appropriate under the circumstances.",
          "Teachers may submit appeals or clarification regarding moderation decisions where applicable.",
          "Payment or content-related disputes may be reviewed through platform moderation procedures.",
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
    number: "07",
    icon: Lock,
    title: "Administrative Review Access",
    content: (
      <>
        <p className="text-muted-foreground">
          Where reasonably necessary for moderation, support, compliance, fraud prevention, or dispute resolution purposes,
          authorized administrators may use internal administrative tools to review relevant account information, uploaded content, and platform activity.
        </p>
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1.5 text-muted-foreground">
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Does not provide administrators with access to user passwords.</span>
          </p>
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Is limited to authorized personnel.</span>
          </p>
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>Is monitored and logged for accountability and security purposes.</span>
          </p>
        </div>
      </>
    ),
  },
  {
    number: "08",
    icon: AlertTriangle,
    title: "Limitation of Liability",
    content: (
      <>
        <p className="text-muted-foreground">
          Scholar Share is provided on an &ldquo;as available&rdquo; and &ldquo;as is&rdquo; basis. The platform does not guarantee
          the accuracy, reliability, or completeness of uploaded content or user transactions.
        </p>
        <p className="mt-2 text-muted-foreground">
          To the maximum extent permitted by applicable law, Scholar Share is not responsible for user-generated content,
          payment disputes between users, or losses resulting from platform use, interruptions, or unauthorized access.
        </p>
      </>
    ),
  },
  {
    number: "09",
    icon: RefreshCw,
    title: "Changes to Terms",
    content: (
      <p className="text-muted-foreground">
        These Terms and Conditions may be updated periodically. Continued use of the platform after updates constitutes
        acceptance of the revised Terms.
      </p>
    ),
  },
  {
    number: "10",
    icon: Lock,
    title: "Data Retention & Deletion",
    content: (
      <>
        <p className="text-muted-foreground mb-3">
          This section describes how user content and account data are retained and ultimately removed from the platform.
        </p>
        <p className="text-sm font-medium mb-2">Note Deletion Lifecycle</p>
        <ul className="space-y-2 mb-3">
          {[
            "When a teacher deletes a note, it is moved to a trash or soft-deleted state for 30 days. During this period, the note may be recoverable through platform features or by contacting support.",
            "After 30 days, the note is automatically and permanently removed from user-accessible trash. It can no longer be recovered by the user.",
            "For security and audit purposes, the deleted note data is retained internally within the system for an additional 15 days following the trash period.",
            "After this 15-day internal retention period, all associated data is permanently erased from the system and cannot be retrieved under any circumstances.",
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
            "When a user account is deleted, all associated content including notes, requests, and personal data follows the same 30-day soft-delete period where recovery may be possible.",
            "After 30 days, the account and associated data enter a 15-day internal security retention window before being permanently erased.",
            "Activity logs may be retained for up to 90 days for security and audit purposes before being anonymized or deleted.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1.5">
          <p className="flex items-start gap-2 text-destructive font-medium">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Once the 30-day recovery window has passed, deleted content <strong>cannot</strong> be restored for any reason. Teachers are strongly advised to maintain their own backups of important materials.</span>
          </p>
        </div>
      </>
    ),
  },
];

export default function TermsConditions() {
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
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">Terms & Conditions</h1>
                <p className="text-xs text-muted-foreground">Last updated: June 19, 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-3xl px-4 py-8 space-y-6">
          {sections.map(({ number, icon: Icon, title, content }) => (
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
