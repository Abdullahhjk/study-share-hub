import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, XCircle, AlertCircle, Bug } from "lucide-react";

interface TestItem {
  id: string;
  label: string;
  status: "untested" | "pass" | "fail";
}

interface TestSection {
  title: string;
  items: TestItem[];
}

const QATesting = () => {
  const [testSections, setTestSections] = useState<TestSection[]>([
    {
      title: "Admin - Payments Tab Actions",
      items: [
        { id: "pay-1", label: "Warn button shows confirmation and records warning", status: "untested" },
        { id: "pay-2", label: "View button opens payment detail", status: "untested" },
        { id: "pay-3", label: "Send Notification opens modal", status: "untested" },
        { id: "pay-4", label: "Block Account sets is_blocked flag", status: "untested" },
        { id: "pay-5", label: "Blocked user cannot perform restricted actions", status: "untested" },
        { id: "pay-6", label: "Unblock account restores access", status: "untested" },
      ],
    },
    {
      title: "Send Notification Modal (Cohere AI)",
      items: [
        { id: "snm-1", label: "Predefined templates populate title + message", status: "untested" },
        { id: "snm-2", label: "Sub-reasons selectable (Fraud / Chargeback / etc.)", status: "untested" },
        { id: "snm-3", label: "Custom template clears fields", status: "untested" },
        { id: "snm-4", label: "AI Enhance calls ai-enhance-notification edge function", status: "untested" },
        { id: "snm-5", label: "AI returns strict JSON {title, message}", status: "untested" },
        { id: "snm-6", label: "Send delivers notification to recipient", status: "untested" },
        { id: "snm-7", label: "Recipient sees it in dashboard notifications tab", status: "untested" },
      ],
    },
    {
      title: "Admin - Build Report Tab",
      items: [
        { id: "br-1", label: "Build Report tab visible only to admins", status: "untested" },
        { id: "br-2", label: "Changelog input accepts multi-line text", status: "untested" },
        { id: "br-3", label: "AI Generate calls ai-build-report-email function", status: "untested" },
        { id: "br-4", label: "Returns strict JSON {subject, html}", status: "untested" },
        { id: "br-5", label: "Editable preview renders HTML correctly", status: "untested" },
        { id: "br-6", label: "Subscribers list loads from DB", status: "untested" },
        { id: "br-7", label: "Send via ActivePieces webhook succeeds", status: "untested" },
        { id: "br-8", label: "Sent build_report row inserted with sent_at", status: "untested" },
        { id: "br-9", label: "Mailto fallback opens default mail client", status: "untested" },
      ],
    },
    {
      title: "Header - Notifications Menu & Badge",
      items: [
        { id: "hdr-1", label: "Notifications menu item appears in header", status: "untested" },
        { id: "hdr-2", label: "Red unread badge shows count", status: "untested" },
        { id: "hdr-3", label: "Badge polls and updates within 30s", status: "untested" },
        { id: "hdr-4", label: "Click deep-links to /dashboard?tab=notifications", status: "untested" },
        { id: "hdr-5", label: "Notifications button stays highlighted while menu open", status: "untested" },
        { id: "hdr-6", label: "Unread count syncs globally across views", status: "untested" },
      ],
    },
    {
      title: "Footer - Newsletter & Build Metadata",
      items: [
        { id: "ft-1", label: "Environment badge displays (dev/prod)", status: "untested" },
        { id: "ft-2", label: "Build version + timestamp visible", status: "untested" },
        { id: "ft-3", label: "Newsletter subscribe form accepts email", status: "untested" },
        { id: "ft-4", label: "Subscribe inserts into newsletter_subscribers", status: "untested" },
        { id: "ft-5", label: "Duplicate email handled gracefully", status: "untested" },
        { id: "ft-6", label: "Unsubscribe page deactivates subscriber", status: "untested" },
      ],
    },
    {
      title: "Account Blocking (is_blocked flag)",
      items: [
        { id: "blk-1", label: "is_blocked column exists on profiles", status: "untested" },
        { id: "blk-2", label: "blocked_reason captured on block", status: "untested" },
        { id: "blk-3", label: "blocked_at timestamp recorded", status: "untested" },
        { id: "blk-4", label: "RLS prevents blocked users from writes where intended", status: "untested" },
      ],
    },
    {
      title: "My Orders - Auto Refresh on Cancel",
      items: [
        { id: "mo-1", label: "Cancel order button visible for pending orders", status: "untested" },
        { id: "mo-2", label: "Cancel updates DB status immediately", status: "untested" },
        { id: "mo-3", label: "Order list re-fetches and reflects new status", status: "untested" },
        { id: "mo-4", label: "No stale UI requiring manual reload", status: "untested" },
      ],
    },
    {
      title: "Teacher Access Codes (Private Library)",
      items: [
        { id: "ac-1", label: "Teacher can create / rotate access code", status: "untested" },
        { id: "ac-2", label: "Locked library prompts for code", status: "untested" },
        { id: "ac-3", label: "Correct code unlocks notes browsing", status: "untested" },
        { id: "ac-4", label: "Wrong code shows error", status: "untested" },
        { id: "ac-5", label: "RLS policies enforce code-gated access", status: "untested" },
      ],
    },
    {
      title: "Note Reporting & Appeals",
      items: [
        { id: "rpt-1", label: "Report Note dialog opens from note detail", status: "untested" },
        { id: "rpt-2", label: "Report submission stored with reason", status: "untested" },
        { id: "rpt-3", label: "Admin Reports tab lists flagged notes", status: "untested" },
        { id: "rpt-4", label: "Teacher can appeal a takedown", status: "untested" },
        { id: "rpt-5", label: "Admin can resolve / dismiss reports", status: "untested" },
      ],
    },
    {
      title: "Persistent Notifications",
      items: [
        { id: "pn-1", label: "Notifications persist across sessions", status: "untested" },
        { id: "pn-2", label: "Mark as read updates state", status: "untested" },
        { id: "pn-3", label: "Dismiss removes from active list", status: "untested" },
        { id: "pn-4", label: "Broadcast vs targeted rendered correctly", status: "untested" },
      ],
    },
    {
      title: "Admin Impersonation",
      items: [
        { id: "imp-1", label: "Impersonate calls admin-impersonate edge function", status: "untested" },
        { id: "imp-2", label: "Passwordless session created for target user", status: "untested" },
        { id: "imp-3", label: "Activity log records impersonation event", status: "untested" },
        { id: "imp-4", label: "Return-to-admin path works", status: "untested" },
      ],
    },
    {
      title: "Activity Logging",
      items: [
        { id: "log-1", label: "Sensitive actions captured (block, send, impersonate)", status: "untested" },
        { id: "log-2", label: "IP address recorded", status: "untested" },
        { id: "log-3", label: "Granular metadata stored per event", status: "untested" },
        { id: "log-4", label: "Activity Logs tab renders entries chronologically", status: "untested" },
      ],
    },
    {
      title: "Refund Management (with screenshots)",
      items: [
        { id: "rf-1", label: "Refund request flow requires payment proof", status: "untested" },
        { id: "rf-2", label: "Teacher uploads refund screenshot", status: "untested" },
        { id: "rf-3", label: "Student sees refund screenshot when completed", status: "untested" },
        { id: "rf-4", label: "Refund status transitions correctly", status: "untested" },
      ],
    },
    {
      title: "Download Codes & Pages",
      items: [
        { id: "dl-1", label: "/download page accepts redeem code", status: "untested" },
        { id: "dl-2", label: "redeem-download-code edge function validates code", status: "untested" },
        { id: "dl-3", label: "Valid code returns secure file URL", status: "untested" },
        { id: "dl-4", label: "Used / expired code rejected gracefully", status: "untested" },
      ],
    },
    {
      title: "Misc Pages (Your Data, Privacy, Terms, Help)",
      items: [
        { id: "msc-1", label: "/database-data renders user's data export", status: "untested" },
        { id: "msc-2", label: "/privacy renders without errors", status: "untested" },
        { id: "msc-3", label: "/terms includes impersonation + tax clauses", status: "untested" },
        { id: "msc-4", label: "/help category-first navigation works", status: "untested" },
        { id: "msc-5", label: "/unsubscribe deactivates newsletter subscriber", status: "untested" },
      ],
    },
    {
      title: "Post-build npm script",
      items: [
        { id: "pb-1", label: "`npm run post-build` script documented in package.json", status: "untested" },
        { id: "pb-2", label: "scripts/post-build.js executes after build", status: "untested" },
        { id: "pb-3", label: "Prompts for changelog input", status: "untested" },
        { id: "pb-4", label: "Opens local preview in browser", status: "untested" },
      ],
    },
  ]);

  const [bugReports, setBugReports] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [testedBy, setTestedBy] = useState<string>("");

  const updateItemStatus = (
    sectionIndex: number,
    itemId: string,
    status: "pass" | "fail"
  ) => {
    setTestSections((prev) => {
      const updated = [...prev];
      const itemIndex = updated[sectionIndex].items.findIndex(
        (item) => item.id === itemId
      );
      if (itemIndex !== -1) {
        updated[sectionIndex].items[itemIndex].status = status;
      }
      return updated;
    });
  };

  const getStats = () => {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let untested = 0;

    testSections.forEach((section) => {
      section.items.forEach((item) => {
        total++;
        if (item.status === "pass") passed++;
        else if (item.status === "fail") failed++;
        else untested++;
      });
    });

    return { total, passed, failed, untested };
  };

  const stats = getStats();

  const resetAll = () => {
    setTestSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          status: "untested" as const,
        })),
      }))
    );
    setBugReports("");
    setSeverity("");
    setTestedBy("");
  };

  const exportReport = () => {
    const report = {
      testedBy,
      date: new Date().toISOString(),
      stats,
      sections: testSections,
      bugReports,
      severity,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Bug className="h-8 w-8" />
            QA Testing Dashboard
          </h1>
          <p className="text-muted-foreground">
            Internal testing page - Not linked in navigation
          </p>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.passed}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.untested}
                </div>
                <div className="text-sm text-muted-foreground">Untested</div>
              </div>
            </div>
            <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full flex">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tester Info */}
        <Card>
          <CardHeader>
            <CardTitle>Tester Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tester">Tested By</Label>
              <input
                id="tester"
                type="text"
                value={testedBy}
                onChange={(e) => setTestedBy(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                placeholder="Enter your name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Test Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {testSections.map((section, sectionIndex) => {
                const sectionPassed = section.items.filter(
                  (i) => i.status === "pass"
                ).length;
                const sectionFailed = section.items.filter(
                  (i) => i.status === "fail"
                ).length;

                return (
                  <AccordionItem
                    key={section.title}
                    value={section.title}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span>{section.title}</span>
                        <div className="flex gap-2">
                          {sectionPassed > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-600"
                            >
                              {sectionPassed} ✓
                            </Badge>
                          )}
                          {sectionFailed > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-600"
                            >
                              {sectionFailed} ✗
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {section.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {item.status === "pass" && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                              {item.status === "fail" && (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              {item.status === "untested" && (
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span
                                className={
                                  item.status === "fail" ? "text-red-600" : ""
                                }
                              >
                                {item.label}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  item.status === "pass" ? "default" : "outline"
                                }
                                className={
                                  item.status === "pass"
                                    ? "bg-green-500 hover:bg-green-600"
                                    : ""
                                }
                                onClick={() =>
                                  updateItemStatus(
                                    sectionIndex,
                                    item.id,
                                    "pass"
                                  )
                                }
                              >
                                Pass
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  item.status === "fail" ? "default" : "outline"
                                }
                                className={
                                  item.status === "fail"
                                    ? "bg-red-500 hover:bg-red-600"
                                    : ""
                                }
                                onClick={() =>
                                  updateItemStatus(
                                    sectionIndex,
                                    item.id,
                                    "fail"
                                  )
                                }
                              >
                                Fail
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Bug Report Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bug Report Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Overall Severity</Label>
              <RadioGroup
                value={severity}
                onValueChange={setSeverity}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="text-green-600">
                    Low
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-yellow-600">
                    Medium
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="text-orange-600">
                    High
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="critical" id="critical" />
                  <Label htmlFor="critical" className="text-red-600">
                    Critical
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="bugs">Detailed Bug Reports</Label>
              <Textarea
                id="bugs"
                value={bugReports}
                onChange={(e) => setBugReports(e.target.value)}
                placeholder="Describe any bugs found, steps to reproduce, expected vs actual behavior..."
                className="mt-1 min-h-[150px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={exportReport} className="gap-2">
            Export Report
          </Button>
          <Button variant="outline" onClick={resetAll}>
            Reset All Tests
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Access this page at:{" "}
          <code className="bg-muted px-2 py-1 rounded">/qa-testing</code>
        </p>
      </div>
    </div>
  );
};

export default QATesting;
