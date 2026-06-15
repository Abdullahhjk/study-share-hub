import { useState } from "react";
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

} from "lucide-react";

type Category =

  | "student"

  | "teacher"

  | "status"

  | "reports"

  | "privacy"

  | "faq"

  | null;

export default function UserManual() {

  const [selectedCategory, setSelectedCategory] = useState<Category>(null);

  const categories: {

    key: Exclude<Category, null>;

    title: string;

    desc: string;

    Icon: typeof BookOpen;

  }[] = [

      { key: "student", title: "Student Guide", desc: "Find notes, buy them, and download your files.", Icon: BookOpen },

      { key: "teacher", title: "Teacher Guide", desc: "Sign up, add bank details, and upload notes.", Icon: Upload },

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

          <Section icon={CreditCard} title="2. Buying paid notes">

            <p>Here is how to buy paid notes step by step:</p>

            <ul className="list-disc space-y-2 pl-4">

              <li>

                <strong>Add to cart</strong> — Click "Add to Cart" on the notes you want. If you buy multiple notes, they must be from the same teacher.

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

                <strong>Save your Request ID</strong> — After you submit, you get a unique Request ID. Save it. You will need it to track your order.

              </li>

            </ul>

          </Section>

          <Section icon={Download} title="3. Downloading your notes">

            <p>

              Once the teacher checks their account and confirms your payment, your request is approved. The system creates a one-time <strong>Download Code</strong> for you.

            </p>

            <p>

              Go to <strong>My Orders</strong> in the menu. Enter your Request ID. Click <strong>Download Notes</strong>.

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

          <Section icon={Flag} title="4. Reporting a problem">

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

          <Section icon={User} title="1. Creating your account">

            <p>

              Click <strong>Login → Sign Up</strong>. Fill in your details and accept the terms. Your account will be marked as <strong>Pending</strong>.

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

          <Section icon={Banknote} title="3. Adding payment methods">

            <p>

              Students pay you directly. Go to <strong>Dashboard → Profile → Payment Settings</strong> to add where you want to receive money.

            </p>

            <ul className="list-disc pl-4 space-y-2">

              <li><strong>Up to 5 methods.</strong> You can add a maximum of 5 bank accounts or mobile wallets.</li>

              <li><strong>What you can add.</strong> Choose from mobile wallets (EasyPaisa, JazzCash) or Islamic banks (Meezan Bank, Faysal Bank, BankAlfalah, etc.).</li>

              <li><strong>Pick a preferred method.</strong> Mark one as your "Preferred" method. It will show up first when students are checking out.</li>

            </ul>

          </Section>

          <Section icon={Upload} title="4. Uploading and managing notes">

            <p>

              Go to the <strong>Upload</strong> tab in your dashboard. Give your notes a clear title and description. Pick the right category and subject. Set a price or make them free.

            </p>

            <p>

              Upload your notes as a PDF. You can also add a cover image. You can edit or delete your notes anytime:

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

                  Click the trash icon to remove a note. The app will ask you to confirm first.

                </div>

              </div>

            </div>

          </Section>

          <Section icon={ShoppingCart} title="5. Handling student requests">

            <p>

              When a student buys your notes, you will see it in your <strong>Request Management</strong> panel.

            </p>

            <p>

              Open the request. Check the student's receipt screenshot. Open your bank or wallet app and make sure you got the money. If everything is correct, click <strong>Approve</strong>. The system will give the student a download code automatically.

            </p>

            <p>

              You do not need to send files yourself. If the receipt is wrong, click <strong>Reject</strong> and explain why. Send the refund back through your wallet app.

            </p>

          </Section>

          <Section icon={Bell} title="6. Notifications, reports, and activity">

            <p>Your dashboard has a few extra tools:</p>

            <ul className="list-disc pl-4 space-y-2">

              <li><strong>Notifications</strong> — Messages from admins and platform updates.</li>

              <li><strong>Reports</strong> — If a student reports your note, it shows here. You can read the report and submit an appeal.</li>

              <li><strong>Activity log</strong> — A list of everything done on your account, like logins, uploads, and downloads, with dates and IP addresses.</li>

            </ul>

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

              { Icon: XCircle, color: "text-destructive bg-destructive/5 border-destructive/20", title: "4. Rejected", desc: "The teacher denied your request. This usually means the receipt was wrong or unclear. Check their note to find out why." },

              { Icon: RefreshCw, color: "text-blue-500 bg-blue-500/5 border-blue-500/20", title: "5. Refunded", desc: "The transaction is cancelled. The teacher sent your money back." },

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

              An admin looks at the note and reads your report. If the note breaks the rules, the admin can remove it, warn the teacher, or suspend their account. If the note is fine, the report is dismissed.

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

    { q: "How do I get my notes after I pay?", a: "Once the teacher approves your payment, go to My Orders, enter your Request ID, and click Download Notes." },

    { q: "Can I download my notes more than once?", a: "No. Your download code works only one time. Save your file right away." },

    { q: "Why can't I print or save from the preview?", a: "The preview is locked to prevent copying before download. Click the Download button to save the file." },

    { q: "I bought multiple notes. Do I download them one by one?", a: "No. They are bundled into a single .zip file automatically." },

    { q: "What if the teacher rejects my request?", a: "You will see the reason. The teacher will refund your money." },

    { q: "How long does approval take?", a: "Usually 1–2 days. Contact an admin if it takes longer." },

    { q: "Why can't I upload notes?", a: "Make sure your school name is set in Profile Settings. It is required before uploading." },

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

    { q: "How do I contact an admin?", a: "Use the Report button on any note, or email support from the footer link. You can also flag issues directly from your order page." },

    { q: "What happens if a teacher never approves my order?", a: "If it takes more than 2 days, contact an admin. They can check the order and help you get a refund or approval." },

    { q: "Can I share my downloaded notes with friends?", a: "No. Downloads are for you only. Sharing files breaks the terms and can get your account blocked." },

    { q: "How do I change my school name after signing up?", a: "Go to Dashboard → Settings and update your school name. Save the changes before uploading new notes." },

    { q: "Can I see who bought my notes?", a: "Teachers can see order details like the student's email and phone number in the Request Management panel, but not their full profile." },

    { q: "Why do I need to add a phone number?", a: "So students and admins can reach you about orders, payments, and refunds quickly." },

    { q: "What if my upload keeps failing?", a: "Check your internet connection and make sure the file is a PDF under 50 MB. If it still fails, try again later or contact an admin." },

    { q: "Can I set notes to free after making them paid?", a: "Yes. Edit the note and change the price to zero. Students will then be able to download it instantly for free." },

    { q: "Is there any fee for teachers to use the platform?", a: "No signup fee. The platform takes a 15% commission only when a paid note is successfully sold." },

    { q: "How does the platform make money?", a: "We take a 15% commission from each paid note sale. Free notes have no charge for either students or teachers." },

    { q: "Can I have multiple teacher accounts?", a: "No. One person should use one account. Multiple accounts for the same person can be suspended." },

    { q: "What should I do if I forgot my Request ID?", a: "Check your email inbox. We send the Request ID there when you place an order. You can also find it in your browser history if you saved the order page." },

    { q: "Can students message teachers directly?", a: "No direct chat. Students share their email and phone number during checkout so teachers can contact them if needed." },

    { q: "Why was my teacher account rejected?", a: "Admins check that you are a real teacher. Make sure you used a real name, real school, and clear profile picture. You can sign up again with correct details." },

    { q: "How do I update my bank account details?", a: "Go to Dashboard → Profile → Payment Settings. You can edit, delete, or add new methods up to a total of 5." },

    { q: "Are my payment details saved on the platform?", a: "Teachers save their own payout details in their profile. Students do not save bank info; they pay off-platform and upload a receipt." },

    { q: "What browsers work best with this site?", a: "Chrome, Safari, Firefox, and Edge all work well. Make sure your browser is up to date." },

    { q: "Can I preview a note before buying?", a: "Yes. Click any note card to see details and a preview. You cannot download or print from the preview until you pay." },

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
      case "student":
        return renderStudentGuide();
      case "teacher":
        return renderTeacherGuide();
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