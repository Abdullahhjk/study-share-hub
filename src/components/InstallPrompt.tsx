import { useEffect, useState } from "react";
import { Download, Share, X, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const INSTALL_SEEN_KEY = "ns_install_prompt_seen";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (
    typeof window !== "undefined" &&
    "standalone" in window.navigator &&
    (window.navigator as unknown as { standalone: boolean }).standalone
  ) {
    return true;
  }
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosSteps, setIosSteps] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(INSTALL_SEEN_KEY) === "1") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setShow(true);
      localStorage.setItem(INSTALL_SEEN_KEY, "1");
    };

    const handleAppInstalled = () => {
      localStorage.setItem(INSTALL_SEEN_KEY, "1");
      setShow(false);
    };

    const evaluate = () => {
      if (isStandalone()) {
        localStorage.setItem(INSTALL_SEEN_KEY, "1");
        return;
      }
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isMobile || isIOS()) {
        setShow(true);
        localStorage.setItem(INSTALL_SEEN_KEY, "1");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timer = setTimeout(evaluate, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(INSTALL_SEEN_KEY, "1");
        setShow(false);
      }
      return;
    }
    if (isIOS()) {
      setIosSteps(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem(INSTALL_SEEN_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-md rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex items-start gap-3">
          <img
            src="/preview.png"
            alt="Scholar Share"
            className="h-11 w-11 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-tight">Download the app</p>
                <p className="text-sm text-muted-foreground">
                  Install Scholar Share on your Home Screen and open it in its own window.
                </p>
              </div>
              <button
                onClick={dismiss}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {deferred && (
              <Button className="mt-3 w-full gap-2" onClick={handleInstall}>
                <Download className="h-4 w-4" />
                Download the app
              </Button>
            )}

            {isIOS() && !deferred && (
              <>
                <Button className="mt-3 w-full gap-2" onClick={handleInstall}>
                  <Download className="h-4 w-4" />
                  {iosSteps ? "Got it" : "Download the app"}
                </Button>

                {iosSteps && (
                  <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        1
                      </span>
                      Tap the <Share className="h-4 w-4" /> Share button
                      in your browser
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        2
                      </span>
                      Select Add to Home Screen
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        3
                      </span>
                      Tap <HomeIcon className="h-4 w-4" /> Add to finish
                    </li>
                  </ol>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}