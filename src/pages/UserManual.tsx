import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import {

  Accordion,

  AccordionContent,

  AccordionItem,

  AccordionTrigger,

} from "@/components/ui/accordion";

import {

  BookOpen,

  Search,

  ShoppingCart,

  User,

  Upload,

  Settings,

  FileText,

  CreditCard,

  CheckCircle,

  XCircle,

  Clock,

  RefreshCw,

  ArrowLeft,

  HelpCircle,

  Flag,

  Bell,

  Shield,

  Scale,

  FolderLock,

  Pencil,

  Trash2,

  Download,

  Lock,

  Banknote,

  Crown,

  Users,

  Activity,

  BarChart3,

  Layers,

  Database,

  Cpu,

  ScrollText,

  Terminal,

  Hammer,

  Coins,

  Key,

  GraduationCap,

  Eye,

  Globe,

  UserCheck,

} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type UserRole = "anon" | "student" | "pending" | "teacher" | "coadmin" | "admin";

type Category =

  | "gettingStarted"

  | "student"

  | "teacher"

  | "coadmin"

  | "admin"

  | "status"

  | "reports"

  | "privacy"

  | "faq"

  | null;

const ROLE_LABELS: Record<UserRole, string> = {

  anon: "Guest",

  student: "Student",

  pending: "Teacher (pending approval)",

  teacher: "Teacher",

  coadmin: "Co-Admin",

  admin: "Admin",

};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {

  anon: "Browse, buy and download notes. No account needed.",

  student: "Browse, buy and download notes using a Request ID.",

  pending: "Your teacher account is waiting for admin approval.",

  teacher: "Upload notes, set prices, and manage student requests.",

  coadmin: "Moderate content and help run day-to-day platform operations.",

  admin: "Full control: platform settings, commissions, pricing, and system tools.",

};

export default function UserManual() {

  const [selectedCategory, setSelectedCategory] = useState<Category>(null);

  const [userRole, setUserRole] = useState<UserRole>("anon");

  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {

    let active = true;

    (async () => {

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {

        if (active) setUserRole("anon");

        return;

      }

      const { data } = await supabase

        .from("user_roles")

        .select("role")

        .eq("user_id", session.user.id)

        .maybeSingle();

      const raw = data?.role as string | undefined;

      let role: UserRole = "student";

      if (raw === "admin") role = "admin";

      else if (raw === "coadmin") role = "coadmin";

      else if (raw === "teacher") role = "teacher";

      else if (raw === "pending") role = "pending";

      if (active) setUserRole(role);

    })().finally(() => {

      if (active) setRoleLoaded(true);

    });

    return () => { active = false; };

  }, []);

  const canSeeTeacher = userRole === "teacher" || userRole === "pending" || userRole === "coadmin" || userRole === "admin";

  const canSeeCoadmin = userRole === "coadmin" || userRole === "admin";

  const canSeeAdmin = userRole === "admin";

  const categories: {

    key: Exclude<Category, null>;

    title: string;

    desc: string;

    Icon: typeof BookOpen;

  }[] = [

      { key: "gettingStarted", title: "Getting Started", desc: "What Scholar Share is, who it is for, and how each role works.", Icon: BookOpen },

      { key: "student", title: "Student Guide", desc: "Find notes, buy them, and download your files.", Icon: BookOpen },

      ...(canSeeTeacher ? [{ key: "teacher" as const, title: "Teacher Guide", desc: "Get approved, upload notes, and manage your sales.", Icon: Upload }] : []),

      ...(canSeeCoadmin ? [{ key: "coadmin" as const, title: "Co-Admin Guide", desc: "Moderate users, content, reports, and approvals.", Icon: Shield }] : []),

      ...(canSeeAdmin ? [{ key: "admin" as const, title: "Admin Guide", desc: "Full management: platform settings, commissions, pricing, and system tools.", Icon: Crown }] : []),

      { key: "status", title: "Order Status", desc: "See what each order stage means.", Icon: Clock },

      { key: "reports", title: "Reports & Appeals", desc: "Report bad content or respond to a report.", Icon: Flag },

      { key: "privacy", title: "Privacy & Data", desc: "Your data, your rights, and deleting your account.", Icon: FolderLock },

      { key: "faq", title: "FAQs", desc: "Quick answers to common questions.", Icon: HelpCircle },

    ];

  const renderCategorySelector = () => (

    <div className="space-y-8 animate-fade-in">

      <div className="text-center space-y-3 max-w-xl mx-auto">

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-poppins">

          How can we help you?

        </h1>

        <p className="text-sm sm:text-base text-muted-foreground font-inter">

          Pick a topic below. We will show you exactly what to do, step by step.

        </p>

        {roleLoaded && userRole && (

          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-xs font-inter">

            <Badge variant="secondary" className="gap-1.5">

              <GraduationCap className="h-3 w-3" />

              {ROLE_LABELS[userRole]}

            </Badge>

            <span className="text-muted-foreground">{ROLE_DESCRIPTIONS[userRole]}</span>

          </div>

        )}

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">

        {categories.map(({ key, title, desc, Icon }) => (

          <Card

            key={key}

            className="group border border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] rounded-lg"

            onClick={() => setSelectedCategory(key)}

          >

            <CardContent className="flex flex-col items-center p-6 text-center h-full justify-between">

              <div className="flex flex-col items-center space-y-3">

                <div className="p-3 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">

                  <Icon className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />

                </div>

                <span className="font-semibold font-poppins text-base text-card-foreground group-hover:text-primary transition-colors">{title}</span>

                <p className="text-xs text-muted-foreground font-inter leading-relaxed">

                  {desc}

                </p>

              </div>

            </CardContent>

          </Card>

        ))}

      </div>

    </div>

  );

  const BackButton = () => (

    <Button

      variant="ghost"

      size="sm"

      onClick={() => setSelectedCategory(null)}

      className="mb-4 text-muted-foreground hover:text-foreground group px-2 font-inter"

    >

      <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-0.5" />

      Back to menu

    </Button>

  );

  const Section = ({

    icon: Icon,

    title,

    children,

  }: {

    icon: typeof BookOpen;

    title: string;

    children: React.ReactNode;

  }) => (

    <div className="space-y-3 border-b border-border/40 pb-5 last:border-0 last:pb-0">

      <h3 className="font-semibold font-poppins flex items-center gap-2.5 text-base text-foreground">

        <div className="p-1.5 bg-primary/5 rounded">

          <Icon className="h-4 w-4 text-primary shrink-0" />

        </div>

        {title}

      </h3>

      <div className="text-sm text-muted-foreground font-inter ml-10 space-y-3 leading-relaxed">

        {children}

      </div>

    </div>

  );

  const renderGettingStarted = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <BookOpen className="h-6 w-6 text-primary" />

            Getting Started

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <Section icon={BookOpen} title="1. What is Scholar Share?">

            <p>

              Scholar Share is a marketplace where verified teachers upload their notes and students find study material, buy it, and download it. Teachers keep control of their content, and every sale is handled through a simple request-and-approval flow — no account is needed to buy.

            </p>

          </Section>

          <Section icon={Users} title="2. Who uses the platform?">

            <p>Every account on Scholar Share fits one of these roles. The tools you see depend on your role.</p>

            <div className="space-y-2">

              {[

                { Icon: Eye, title: "Guest / Student", desc: "Browse notes, preview them, buy paid notes, and download files. No account required." },

                { Icon: GraduationCap, title: "Teacher", desc: "Sign up and get approved, then upload notes, set prices, and manage student requests." },

                { Icon: Shield, title: "Co-Admin", desc: "Appointed by the admin to moderate users, content, notifications, and reports. No financial or system settings." },

                { Icon: Crown, title: "Admin", desc: "Full control — platform settings, commission rates, price limits, payments, users, and system tools." },

              ].map(({ Icon, title, desc }) => (

                <div key={title} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">

                  <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />

                  <div>

                    <p className="font-semibold text-foreground text-sm">{title}</p>

                    <p className="text-xs text-muted-foreground">{desc}</p>

                  </div>

                </div>

              ))}

            </div>

          </Section>

          <Section icon={Globe} title="3. Choosing your currency">

            <p>

              Use the currency picker in the top header to choose how prices are shown. Prices are defined by each teacher in a base currency (PKR by default), and the app converts and displays them in the currency you select.

            </p>

          </Section>

          <Section icon={Settings} title="4. Display settings">

            <p>

              Once logged in, open the settings menu to adjust font size, high contrast, dyslexia-friendly text, and colorblind modes. These preferences are saved to your account.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const renderStudentGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <BookOpen className="h-6 w-6 text-primary" />

            Student Guide

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <Section icon={Search} title="1. Finding notes">

            <p>

              You do not need an account to look at notes. Just open the website and start browsing.

            </p>

            <p>

              Use the search bar to find notes by name. You can also filter by category, subject, teacher, or school name. Click any note card to see more details and a preview.

            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 bg-muted/30 p-3 rounded-lg border border-border/40 text-xs">

              <span className="font-semibold text-foreground shrink-0 uppercase tracking-wider">Two types of notes:</span>

              <div className="flex flex-wrap items-center gap-4">

                <div className="flex items-center gap-1.5">

                  <Badge className="bg-success text-success-foreground hover:bg-success border-0">Free</Badge>

                  <span>Click and download right away.</span>

                </div>

                <div className="flex items-center gap-1.5">

                  <Badge className="bg-warning text-warning-foreground hover:bg-warning border-0">Paid</Badge>

                  <span>You pay the teacher first, then download.</span>

                </div>

              </div>

            </div>

          </Section>

          <Section icon={Download} title="2. Downloading free notes">

            <p>

              Free notes have a <strong>Download Free</strong> button. Click it and the file downloads straight to your device. You can preview the note first by opening the note card.

            </p>

          </Section>

          <Section icon={CreditCard} title="3. Buying paid notes">

            <p>Here is how to buy paid notes step by step:</p>

            <ul className="list-disc space-y-2 pl-4">

              <li>

                <strong>Add to cart</strong> — Click "Add to Cart" on the notes you want. If you buy multiple notes, they must be from the same teacher. A cart can only hold one teacher's notes at a time.

              </li>

              <li>

                <strong>Your contact info</strong> — Enter your email and phone number so the teacher can reach you.

              </li>

              <li>

                <strong>Pick a payment method</strong> — A dropdown shows the teacher's bank accounts and mobile wallets (like EasyPaisa or JazzCash). Pick one.

              </li>

              <li>

                <strong>Send the money</strong> — Copy the account number or IBAN shown. Open your bank or wallet app and send the exact amount. Take a screenshot of the receipt.

              </li>

              <li>

                <strong>Upload the receipt</strong> — Upload your screenshot as proof of payment.

              </li>

              <li>

                <strong>Save your Request ID</strong> — After you submit, you get a unique Request ID. Save it. You will need it to track your order and download your notes.

              </li>

            </ul>

          </Section>

          <Section icon={Clock} title="4. Tracking your order">

            <p>

              Go to <strong>My Orders</strong> in the top menu. Enter your <strong>Request ID</strong> to see the current status. The order moves through these stages:

            </p>

            <ul className="list-disc pl-4 space-y-1.5">

              <li><strong>Pending</strong> — The teacher has not checked your payment yet.</li>

              <li><strong>Approved / Completed</strong> — Payment verified, download code ready.</li>

              <li><strong>Downloaded</strong> — You used your code.</li>

              <li><strong>Rejected</strong> — The teacher could not verify the receipt. Check the reason.</li>

              <li><strong>Refunded</strong> — The teacher sent your money back.</li>

            </ul>

          </Section>

          <Section icon={Download} title="5. Downloading your notes">

            <p>

              Once the teacher confirms your payment, your request is approved and the system creates a one-time <strong>Download Code</strong> for you.

            </p>

            <p>

              Go to <strong>My Orders</strong> and click <strong>Download Notes</strong> using your Request ID, or open the download link provided to you.

            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3.5 rounded-lg text-xs space-y-2">

              <p className="font-semibold flex items-center gap-1.5">

                <Lock className="h-3.5 w-3.5 shrink-0" /> Please remember:

              </p>

              <ul className="list-disc pl-4 space-y-1">

                <li><strong>One time only.</strong> Your download code works exactly once. After you download, the code expires. Make sure you save the file safely.</li>

                <li><strong>Preview is locked.</strong> You cannot print or save from the preview window. Click the "Download" button to get your file.</li>

                <li><strong>Multiple notes = one ZIP file.</strong> If you bought several notes in one order, they come bundled as a single .zip file.</li>

              </ul>

            </div>

          </Section>

          <Section icon={Flag} title="6. Reporting a problem">

            <p>

              If a note is fake, wrong, or breaks the rules, you can report it. Click the <strong>flag icon</strong> on the note card or in the details window.

            </p>

            <p>

              Choose a reason (copyright, spam, wrong subject, etc.) and write a short message. You can report without your name, or add your email if you want a reply from us.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const renderTeacherGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <Upload className="h-6 w-6 text-primary" />

            Teacher Guide

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          {userRole === "pending" && (

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3.5 rounded-lg text-xs space-y-1">

              <p className="font-semibold">Your account is pending approval.</p>

              <p>You cannot upload notes yet. The admin reviews each new teacher account. You will be notified once you are approved.</p>

            </div>

          )}

          <Section icon={User} title="1. Creating your account">

            <p>

              Click <strong>Login → Sign Up</strong>. Fill in your details and confirm you are a qualified teacher. Your account will be marked as <strong>Pending</strong>.

            </p>

            <p>

              An admin will review your signup to make sure you are a real teacher. You will get a notification when you are approved. You cannot upload notes until then.

            </p>

          </Section>

          <Section icon={Settings} title="2. Setting up your profile">

            <p>

              Go to <strong>Dashboard → Settings</strong>. Fill in these details before you upload:

            </p>

            <ul className="list-disc pl-4 space-y-1.5">

              <li><strong>Phone number</strong> — So students and admins can contact you about orders.</li>

              <li><strong>School name (required)</strong> — Enter your school, college, or institution. Students use this to find your notes. You cannot skip this.</li>

              <li><strong>Profile picture</strong> — Upload a photo so students can recognize you.</li>

            </ul>

          </Section>

          <Section icon={Coins} title="3. Your Platform Settings">

            <p>

              The <strong>Your Platform Settings</strong> card on the Settings page shows the rules the admin assigned to your account:

            </p>

            <ul className="list-disc pl-4 space-y-1.5">

              <li><strong>Commission Rate</strong> — The percentage taken from each successful paid sale. This is your rate only; other teachers may have a different rate.</li>

              <li><strong>Settings Currency</strong> — The base currency (for example PKR) the admin configured your limits in.</li>

              <li><strong>Note Price Range</strong> — The minimum and maximum price you can set for a paid note. It is shown converted into the currency you selected in the header.</li>

            </ul>

          </Section>

          <Section icon={Banknote} title="4. Adding payment methods">

            <p>

              Students pay you directly. Go to <strong>Dashboard → Profile → Payment Settings</strong> to add where you want to receive money.

            </p>

            <ul className="list-disc pl-4 space-y-2">

              <li><strong>Up to 5 methods.</strong> You can add a maximum of 5 bank accounts or mobile wallets.</li>

              <li><strong>What you can add.</strong> Choose from mobile wallets (EasyPaisa, JazzCash) or Islamic banks (Meezan Bank, Faysal Bank, BankAlfalah, etc.).</li>

              <li><strong>Pick a preferred method.</strong> Mark one as your "Preferred" method. It will show up first when students are checking out.</li>

            </ul>

          </Section>

          <Section icon={Upload} title="5. Uploading and managing notes">

            <p>

              Go to the <strong>Upload</strong> tab in your dashboard. Give your notes a clear title and description. Pick the right category and subject. Set a price or make them free. Note prices must stay within the minimum and maximum range assigned to your account (see <strong>Dashboard → Settings → Your Platform Settings</strong>).

            </p>

            <p>

              Upload your notes as a PDF (under 50 MB). Cover images can be JPG or PNG (under 5 MB). You can edit or delete your notes anytime:

            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 font-inter text-xs">

              <div className="p-3 bg-muted/40 rounded border border-border/50 flex gap-2 items-start">

                <Pencil className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />

                <div>

                  <span className="font-semibold text-foreground block mb-0.5">Edit a note</span>

                  Click the pencil icon to change the title, description, price, or replace the PDF.

                </div>

              </div>

              <div className="p-3 bg-muted/40 rounded border border-border/50 flex gap-2 items-start">

                <Trash2 className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />

                <div>

                  <span className="font-semibold text-foreground block mb-0.5">Delete a note</span>

                  Click the trash icon to remove a note. The app will ask you to confirm first. Deleted notes go to your Trash where you can recover them or delete them forever.

                </div>

              </div>

            </div>

          </Section>

          <Section icon={ShoppingCart} title="6. Handling student requests">

            <p>

              When a student buys your notes, you will see it in your <strong>Request Management</strong> panel.

            </p>

            <p>

              Open the request. Check the student's receipt screenshot. Open your bank or wallet app and make sure you got the money. If everything is correct, click <strong>Approve</strong>. The system will give the student a download code automatically — you never send files yourself.

            </p>

            <p>

              If the receipt is wrong, click <strong>Reject</strong> and explain why. Send the refund back through your wallet app; the order will appear in your Refunds tab.

            </p>

          </Section>

          <Section icon={RefreshCw} title="7. Refunds">

            <p>

              The <strong>Refunds</strong> tab shows rejected and refunded requests. When you reject a request, explain the reason clearly and return the student's money through your wallet or bank app so the order can be marked refunded.

            </p>

          </Section>

          <Section icon={Trash2} title="8. Trash">

            <p>

              Deleted notes are kept in the <strong>Trash</strong> tab for a while. You can recover a note to restore it, or delete it permanently. Permanent deletion cannot be undone.

            </p>

          </Section>

          <Section icon={BarChart3} title="9. Analytics">

            <p>

              The <strong>Analytics</strong> tab shows your performance: note views, downloads, sales, and trends over time. Use it to understand which subjects and topics students buy most.

            </p>

          </Section>

          <Section icon={Layers} title="10. Categories">

            <p>

              You can create categories and subcategories to organize your notes. You can only delete categories you created, and only if they are empty (no notes inside).

            </p>

          </Section>

          <Section icon={Activity} title="11. Activity log">

            <p>

              The <strong>Activity</strong> tab lists everything done on your account — logins, uploads, edits, downloads — with dates and IP addresses. This helps you spot anything unusual.

            </p>

          </Section>

          <Section icon={Bell} title="12. Notifications">

            <p>

              The <strong>Notifications</strong> tab shows messages from admins and platform updates, including your account approval status.

            </p>

          </Section>

          <Section icon={Flag} title="13. Reports and appeals">

            <p>

              If a student reports your note, it shows in your <strong>Reports</strong> tab. You can read the report and submit an appeal explaining your side. The admin reviews every appeal before deciding.

            </p>

          </Section>

          <Section icon={FileText} title="14. Your Data">

            <p>

              Open <strong>Your Data</strong> from the account menu to see everything we store about you, plus your summary:

            </p>

            <ul className="list-disc pl-4 space-y-1.5">

              <li><strong>Active / deleted notes</strong> and pending requests.</li>

              <li><strong>Total Revenue</strong> — the total value of your completed sales.</li>

              <li><strong>Amount Owed to Platform</strong> — your commission owed, calculated at the rate shown next to it (your assigned commission rate).</li>

            </ul>

          </Section>

          <Section icon={Key} title="15. ARCHON Keys (optional)">

            <p>

              ARCHON AI is an optional assistant available to logged-in users. Admins and co-admins get full operations help; other roles get general help. AI features need a Cohere API key, which you can add from the <strong>ARCHON Keys</strong> page. Request quotas reset at midnight UTC.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const renderCoadminGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <Shield className="h-6 w-6 text-primary" />

            Co-Admin Guide

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <Section icon={Shield} title="1. What can a co-admin do?">

            <p>

              Co-admins help run day-to-day operations: reviewing new teachers, moderating content, managing notifications, and handling reports and feedback. When you log in you are taken straight to the <strong>Co-Admin Dashboard</strong>.

            </p>

            <p>

              <strong>Co-admins cannot see admin-only features</strong> such as Platform Settings, AI Quota, DB Backup, Build ChangeLog, Upcoming, or the SQL Console. Those require full admin access.

            </p>

          </Section>

          <Section icon={Layers} title="2. Your tabs">

            <ul className="list-disc pl-4 space-y-1.5">

              <li><strong>Overview</strong> — A dashboard summary of activity.</li>

              <li><strong>Users</strong> — View users and manage roles within your permissions.</li>

              <li><strong>Notes</strong> — Review notes across the platform.</li>

              <li><strong>Categories</strong> — Organize categories and subcategories.</li>

              <li><strong>Notifications</strong> — Send and manage platform notifications.</li>

              <li><strong>Payments</strong> — View payment activity and teacher summaries.</li>

              <li><strong>Reports</strong> — Review content reports.</li>

              <li><strong>Feedback</strong> — Read user feedback.</li>

              <li><strong>Activity</strong> — View platform-wide activity logs.</li>

              <li><strong>Approvals</strong> — Approve or reject new teacher signups.</li>

              <li><strong>Settings</strong> — Your own profile settings.</li>

              <li><strong>Audit Log</strong> — View the audit trail.</li>

            </ul>

          </Section>

          <Section icon={UserCheck} title="3. Approving teachers">

            <p>

              New teachers appear in the <strong>Approvals</strong> tab as <strong>Pending</strong>. Check that the name, school, and profile look legitimate, then approve or reject. Once approved, the teacher can start uploading notes.

            </p>

          </Section>

          <Section icon={Key} title="4. ARCHON AI">

            <p>

              As a co-admin you can use ARCHON AI from the assistant panel. It can help you find data, moderate content, and run operations. You need Cohere API keys added on the <strong>ARCHON Keys</strong> page.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const renderAdminGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <Crown className="h-6 w-6 text-primary" />

            Admin Guide

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <Section icon={Crown} title="1. Full access">

            <p>

              The admin has complete control of the platform. Tabs are grouped into <strong>Content</strong>, <strong>Engagement</strong>, and <strong>System</strong>:

            </p>

            <ul className="list-disc pl-4 space-y-1.5">

              <li><strong>Content</strong> — Users, Notes, Activity.</li>

              <li><strong>Engagement</strong> — Feedback, Reports, Payments, Notifications.</li>

              <li><strong>System</strong> — AI Quota, DB Backup, Audit Log, Platform Settings, Build ChangeLog, Upcoming, Console.</li>

            </ul>

          </Section>

          <Section icon={Settings} title="2. Platform Settings (commission & pricing)">

            <p>

              The <strong>Platform Settings</strong> tab is the source of truth for commission and pricing across the platform. It has two parts:

            </p>

            <div className="bg-muted/30 border border-border/50 p-4 rounded-lg space-y-2 text-xs">

              <p className="font-semibold text-foreground">Settings rows</p>

              <p>Each row defines a set of rules: a <strong>commission</strong> percent taken from paid sales, the <strong>currency code</strong> the limits are defined in (e.g. PKR), and a <strong>min–max note price</strong> range. You can add, edit, or delete rows.</p>

              <p className="font-semibold text-foreground pt-2">Assigning settings to accounts</p>

              <p>Each teacher account is linked to one settings row. Use the selector next to each user to choose which settings apply to them. This is how you give different teachers different commission rates and price limits. A teacher's assigned row is shown to them under <strong>Dashboard → Settings → Your Platform Settings</strong>.</p>

            </div>

          </Section>

          <Section icon={Users} title="3. Users">

            <p>

              The <strong>Users</strong> tab lets you create users, review profiles, and manage roles. Because commission is per-account, user statistics here reflect each user's assigned platform settings rather than one global rate.

            </p>

          </Section>

          <Section icon={UserCheck} title="4. Approving teachers">

            <p>

              New teachers appear as <strong>Pending</strong>. Review their name, school, and photo, then approve or reject them. Approval lets them upload notes.

            </p>

          </Section>

          <Section icon={CreditCard} title="5. Payments">

            <p>

              The <strong>Payments</strong> tab shows payment activity across the platform. Each teacher's summary uses their own commission rate from their assigned platform settings, so the platform's share is calculated correctly per account.

            </p>

          </Section>

          <Section icon={Cpu} title="6. AI Quota & ARCHON">

            <p>

              The <strong>AI Quota</strong> tab manages ARCHON AI usage and API keys. ARCHON can run SQL on your behalf, build reports, and answer questions about the database. You can also configure which tabs it knows about and guide it with the admin preamble.

            </p>

          </Section>

          <Section icon={Database} title="7. DB Backup">

            <p>

              Create and download backups of the database. Keep backups before major changes.

            </p>

          </Section>

          <Section icon={ScrollText} title="8. Audit Log">

            <p>

              A tamper-evident log of administrative actions across the platform for security and accountability.

            </p>

          </Section>

          <Section icon={Terminal} title="9. Console">

            <p>

              Run SQL queries directly against the database. Use with care — there is no undo.

            </p>

          </Section>

          <Section icon={Hammer} title="10. Build ChangeLog & Upcoming">

            <p>

              Publish release notes in <strong>Build ChangeLog</strong> and manage the roadmap in <strong>Upcoming</strong>. These keep teachers and students informed.

            </p>

          </Section>

          <Section icon={Shield} title="11. Investigations">

            <p>

              To investigate a report, an admin may need to look inside a teacher's account. This is done through a secure, one-time link — never by viewing the teacher's password. Every access is logged.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const renderStatusGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <Clock className="h-6 w-6 text-primary" />

            Order Status Guide

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <p className="text-sm text-muted-foreground font-inter">

            When you order paid notes, your request moves through these stages. Here is what each one means:

          </p>

          <div className="space-y-4 font-inter">

            {[

              { Icon: Clock, color: "text-amber-500 bg-amber-500/5 border-amber-500/20", title: "1. Pending", desc: "You sent your request and uploaded your receipt. The teacher has not checked it yet." },

              { Icon: CheckCircle, color: "text-green-500 bg-green-500/5 border-green-500/20", title: "2. Approved / Completed", desc: "The teacher confirmed your payment. Your download code is ready. Go to My Orders to get your files." },

              { Icon: Download, color: "text-emerald-600 bg-emerald-600/5 border-emerald-600/20", title: "3. Downloaded", desc: "You used your download code and saved your files. The code is now expired." },

              { Icon: XCircle, color: "text-destructive bg-destructive/5 border-destructive/20", title: "4. Rejected", desc: "The teacher denied your request. This usually means the receipt was wrong or unclear. Check the reason they left." },

              { Icon: RefreshCw, color: "text-blue-500 bg-blue-500/5 border-blue-500/20", title: "5. Refunded", desc: "The transaction is cancelled. The teacher sent your money back." },

              { Icon: XCircle, color: "text-slate-500 bg-slate-500/5 border-slate-500/20", title: "6. Cancelled", desc: "The request was cancelled and will not be processed." },

            ].map(({ Icon, color, title, desc }) => (

              <div key={title} className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${color.split(' ')[1] || 'border-border'}`}>

                <div className={`p-2 rounded-lg shrink-0 border ${color.split(' ')[2] || 'border-border'}`}>

                  <Icon className={`h-5 w-5 ${color.split(' ')[0]}`} />

                </div>

                <div className="space-y-1">

                  <p className="font-semibold text-base text-foreground font-poppins">{title}</p>

                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

                </div>

              </div>

            ))}

          </div>

          <div className="bg-muted/40 border border-border/60 p-4 rounded-lg space-y-2 font-inter text-sm">

            <h4 className="font-semibold text-foreground font-poppins flex items-center gap-1.5">

              <Search className="h-4 w-4 text-primary" /> How to check your order

            </h4>

            <p className="text-muted-foreground leading-relaxed">

              Click <strong>My Orders</strong> in the top menu. Enter your <strong>Request ID</strong> to see the current status of your order.

            </p>

          </div>

        </CardContent>

      </Card>

    </div>

  );

  const renderReportsGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <Flag className="h-6 w-6 text-primary" />

            Reports & Appeals

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <Section icon={Flag} title="1. How to report something">

            <p>

              If you see a note that is fake, stolen, or just wrong, click the <strong>flag icon</strong> on it.

            </p>

            <p>

              Pick a reason (copyright, spam, wrong subject, etc.) and write a short message. You can submit without your name, or add your email if you want a reply.

            </p>

          </Section>

          <Section icon={Shield} title="2. What happens after you report">

            <p>

              An admin or co-admin looks at the note and reads your report. If the note breaks the rules, they can remove it, warn the teacher, or suspend their account. If the note is fine, the report is dismissed.

            </p>

          </Section>

          <Section icon={Scale} title="3. Teacher appeals">

            <p>

              If a student reports your note, you will see it in your <strong>Dashboard → Reports</strong> tab. You can read why it was reported.

            </p>

            <p>

              If you think the report is wrong, you can submit an appeal explaining your side. The admin will review it before making a final decision.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const renderPrivacyGuide = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <FolderLock className="h-6 w-6 text-primary" />

            Privacy & Your Data

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6 space-y-6">

          <Section icon={FolderLock} title="1. See what data we have">

            <p>

              Go to <strong>Your Data</strong> in the account menu. You will see everything we store about you — your profile, notes, orders, login history, and notifications.

            </p>

          </Section>

          <Section icon={Shield} title="2. Admin access for investigations">

            <p>

              Sometimes an admin may need to look inside a teacher's account to investigate a report. This is done through a secure link, not a password.

            </p>

            <div className="bg-slate-950 text-slate-300 p-4 rounded-lg font-mono text-xs border border-slate-800 space-y-2">

              <div className="text-blue-400 font-semibold flex items-center gap-1.5">

                <Shield className="h-3.5 w-3.5" /> KEY RULES:

              </div>

              <p>• Admins can NEVER see your password.</p>

              <p>• Access uses a one-time secure link.</p>

              <p>• Every access is logged for security.</p>

            </div>

          </Section>

          <Section icon={Scale} title="3. Legal documents">

            <ul className="list-disc pl-4 space-y-1.5">

              <li>

                <a href="/privacy" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">Privacy Policy <FileText className="h-3 w-3" /></a> — What data we collect and how we use it.

              </li>

              <li>

                <a href="/terms" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">Terms & Conditions <Scale className="h-3 w-3" /></a> — The rules of using this platform.

              </li>

            </ul>

          </Section>

          <Section icon={Trash2} title="4. Deleting your account">

            <p>

              You can delete your account anytime. Contact an admin or use the clear-data option in your dashboard.

            </p>

            <p>

              Deletion removes your profile, notes, files, orders, login history, and all other data permanently.

            </p>

          </Section>

        </CardContent>

      </Card>

    </div>

  );

  const faqs: { q: string; a: string }[] = [

    { q: "Do I need an account to buy notes?", a: "No. Students can browse, preview, and buy notes without an account. You only need to save your Request ID after paying to track the order and download your notes." },

    { q: "How do I get my notes after I pay?", a: "Once the teacher approves your payment, go to My Orders, enter your Request ID, and click Download Notes." },

    { q: "Can I download my notes more than once?", a: "No. Your download code works only one time. Save your file right away." },

    { q: "Why can't I print or save from the preview?", a: "The preview is locked to prevent copying before download. Click the Download button to save the file." },

    { q: "I bought multiple notes. Do I download them one by one?", a: "No. They are bundled into a single .zip file automatically." },

    { q: "What if the teacher rejects my request?", a: "You will see the reason. The teacher will refund your money." },

    { q: "How long does approval take?", a: "Usually 1–2 days. Contact an admin if it takes longer." },

    { q: "Why can't I upload notes?", a: "Make sure your school name is set in Profile Settings — it is required before uploading — and that your teacher account has been approved by an admin." },

    { q: "Can I buy notes from two different teachers at once?", a: "No. Your cart can only hold notes from one teacher at a time. Check out separately for each teacher." },

    { q: "Why can't I delete a category?", a: "You can only delete categories you created, and only if they are empty (no notes inside)." },

    { q: "Can I edit a note after uploading?", a: "Yes. Click the pencil icon on any note to change its title, description, price, or file." },

    { q: "What data does the platform track?", a: "Actions like logins, uploads, and downloads are logged with timestamps and IPs. You can see your own logs in the Activity tab." },

    { q: "How do I report a note?", a: "Click the flag icon on the note card or details window. Pick a reason and submit." },

    { q: "What if someone reports my note?", a: "Open Dashboard → Reports to see the report. You can submit an appeal to explain your side." },

    { q: "Can admins see my password?", a: "No. Even when they access your account for investigation, they use a secure link — your password is never visible." },

    { q: "Where are the terms and privacy policy?", a: "They are linked on the signup screen and at /privacy and /terms." },

    { q: "How do I reset my password?", a: "On the login page, click 'Forgot Password'. Enter your email and follow the link we send you to set a new one." },

    { q: "Can I change my email address?", a: "Yes. Go to Dashboard → Settings and update your email. You may need to verify the new one before it works." },

    { q: "What file types can I upload?", a: "Teachers can upload PDFs for notes. Cover images can be JPG or PNG." },

    { q: "Is there a limit on file size?", a: "Yes. Notes must be under 50 MB and cover images under 5 MB." },

    { q: "Can I use the platform on my phone?", a: "Yes. The website works on mobile browsers. You do not need a separate app." },

    { q: "How do I contact an admin?", a: "Use the Report button on any note, or flag issues directly from your order page." },

    { q: "What happens if a teacher never approves my order?", a: "If it takes more than 2 days, contact an admin. They can check the order and help you get a refund or approval." },

    { q: "Can I share my downloaded notes with friends?", a: "No. Downloads are for you only. Sharing files breaks the terms and can get your account blocked." },

    { q: "How do I change my school name after signing up?", a: "Go to Dashboard → Settings and update your school name. Save the changes before uploading new notes." },

    { q: "Can I see who bought my notes?", a: "Teachers can see order details like the student's email and phone number in the Request Management panel, but not their full profile." },

    { q: "Why do I need to add a phone number?", a: "So students and admins can reach you about orders, payments, and refunds quickly." },

    { q: "What if my upload keeps failing?", a: "Check your internet connection and make sure the file is a PDF under 50 MB. If it still fails, try again later or contact an admin." },

    { q: "Can I set notes to free after making them paid?", a: "Yes. Edit the note and change the price to zero. Students will then be able to download it instantly for free." },

    { q: "Is there any fee for teachers to use the platform?", a: "No signup fee. The platform takes a commission only when a paid note is successfully sold. The rate is set by the admin in the platform settings assigned to your account — see Dashboard → Settings → Your Platform Settings." },

    { q: "How does the platform make money?", a: "We take a commission from each paid note sale based on the platform settings assigned to each account. Free notes have no charge for either students or teachers. Your own commission rate and allowed price range are shown in Dashboard → Settings → Your Platform Settings." },

    { q: "Why is there a minimum and maximum price for my notes?", a: "Admins set a note price range in the platform settings assigned to your account. When you set a price, it must stay within that range. View your range in Dashboard → Settings → Your Platform Settings." },

    { q: "Can I change my commission rate or price range myself?", a: "No. Only an admin can change them. Your assigned settings are displayed in Dashboard → Settings → Your Platform Settings." },

    { q: "How are prices converted to my currency?", a: "Prices are stored in a base currency (PKR by default) and converted to the currency you select in the header. The teacher's price range is shown in your selected currency too." },

    { q: "What does 'Amount Owed to Platform' mean?", a: "It is the commission you owe the platform, calculated as your total revenue multiplied by your assigned commission rate. You can see it under Your Data." },

    { q: "Can I have multiple teacher accounts?", a: "No. One person should use one account. Multiple accounts for the same person can be suspended." },

    { q: "What should I do if I forgot my Request ID?", a: "Check your email inbox. We send the Request ID there when you place an order. You can also find it in your browser history if you saved the order page." },

    { q: "Can students message teachers directly?", a: "No direct chat. Students share their email and phone number during checkout so teachers can contact them if needed." },

    { q: "Why was my teacher account rejected?", a: "Admins check that you are a real teacher. Make sure you used a real name, real school, and clear profile picture. You can sign up again with correct details." },

    { q: "How do I update my bank account details?", a: "Go to Dashboard → Profile → Payment Settings. You can edit, delete, or add new methods up to a total of 5." },

    { q: "Are my payment details saved on the platform?", a: "Teachers save their own payout details in their profile. Students do not save bank info; they pay off-platform and upload a receipt." },

    { q: "What browsers work best with this site?", a: "Chrome, Safari, Firefox, and Edge all work well. Make sure your browser is up to date." },

    { q: "Can I preview a note before buying?", a: "Yes. Click any note card to see details and a preview. You cannot download or print from the preview until you pay." },

    { q: "What is ARCHON AI?", a: "ARCHON is an optional AI assistant. Admins and co-admins get full operations help; other logged-in users get general help. It needs Cohere API keys configured and runs within request quotas." },

    { q: "What is the difference between a co-admin and an admin?", a: "A co-admin can moderate users, content, reports, and approvals. Only an admin can change platform settings (commission, price limits), manage AI quota, database backups, the audit log, or run SQL in the Console." },

  ];

  const renderFAQ = () => (

    <div className="space-y-4 animate-scale-in">

      <BackButton />

      <Card className="border border-border/80 shadow-md">

        <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">

          <CardTitle className="flex items-center gap-3 text-xl font-poppins">

            <HelpCircle className="h-6 w-6 text-primary" />

            Frequently Asked Questions

          </CardTitle>

        </CardHeader>

        <CardContent className="p-6">

          <Accordion type="single" collapsible className="w-full space-y-2">

            {faqs.map((f, i) => (

              <AccordionItem key={i} value={`q-${i}`} className="border border-border/60 rounded-lg px-4 bg-card/30 hover:bg-card/50 transition-colors">

                <AccordionTrigger className="text-left font-semibold font-poppins py-4 text-sm sm:text-base hover:text-primary transition-colors hover:no-underline">

                  {f.q}

                </AccordionTrigger>

                <AccordionContent className="text-sm text-muted-foreground font-inter leading-relaxed border-t border-border/40 pt-3 pb-4">

                  {f.a}

                </AccordionContent>

              </AccordionItem>

            ))}

          </Accordion>

        </CardContent>

      </Card>

    </div>

  );

  const renderContent = () => {

    switch (selectedCategory) {

      case "gettingStarted":

        return renderGettingStarted();

      case "student":

        return renderStudentGuide();

      case "teacher":

        return canSeeTeacher ? renderTeacherGuide() : renderCategorySelector();

      case "coadmin":

        return canSeeCoadmin ? renderCoadminGuide() : renderCategorySelector();

      case "admin":

        return canSeeAdmin ? renderAdminGuide() : renderCategorySelector();

      case "status":

        return renderStatusGuide();

      case "reports":

        return renderReportsGuide();

      case "privacy":

        return renderPrivacyGuide();

      case "faq":

        return renderFAQ();

      default:

        return renderCategorySelector();

    }

  };

  return (

    <div className="min-h-screen flex flex-col bg-background font-inter antialiased selection:bg-primary/10 selection:text-primary">

      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-5xl w-full">

        {renderContent()}

      </main>

      <Footer />

    </div>

  );
}
