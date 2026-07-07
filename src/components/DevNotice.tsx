import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const COOKIE_KEY = "ns_dev_notice_dismissed";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export default function DevNotice() {
  const [showDialog, setShowDialog] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const dismissed = getCookie(COOKIE_KEY);
    if (!dismissed) {
      setShowDialog(true);
    }
  }, []);

  const dismissDialog = () => {
    setCookie(COOKIE_KEY, "1", 365);
    setShowDialog(false);
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) dismissDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notice</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                This app is being developed by a <strong>small team of developers</strong>.
                Any contribution will be appreciated.
              </p>
              <p>
                For contact, feedback, or inquiries, use the feedback form at{" "}
                <strong>Footer &rarr; Stay Connected &rarr; Feedback</strong>.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={dismissDialog}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showBanner && (
        <div className="relative bg-muted/80 px-4 py-2.5 text-center text-xs sm:text-sm text-foreground border-b">
          <span>
            Built by a <strong>small team of developers</strong> &mdash; any contribution will be appreciated.
            Feedback?{" "}
            <strong>Footer &rarr; Stay Connected &rarr; Feedback</strong>
          </span>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted-foreground/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
