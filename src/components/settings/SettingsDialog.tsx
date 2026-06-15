import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "@supabase/supabase-js";

import {
  Settings,
  DollarSign,
  Euro,
  JapaneseYen,
  PoundSterling,
  BadgeCent,
  Coins,
  AlertTriangle,
  Eye,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppearanceSection } from "./AppearanceSection";
import { CurrencySection } from "./CurrencySection";
import { AccessibilitySection } from "./AccessibilitySection";
import { Separator } from "../ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { dispatchCurrencyEvent, fetchUserCurrency, AUTO_CURRENCY_KEY } from "@/lib/currency";

interface Currency {
  code: string;
  label: string;
  icon: LucideIcon;
}

interface SettingsState {
  currency: string;
  fontSize: string;
  highContrast: boolean;
  dyslexiaFriendly: boolean;
  colorBlindMode: boolean;
  colorBlindType: string;
  appearance: string;
  showDropdown: boolean;
  autoCurrency: boolean;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

function readLocalStorage(): SettingsState {
  return {
    currency: localStorage.getItem("currency") ?? "PKR",
    fontSize: localStorage.getItem("font-size") ?? "normal",
    highContrast: localStorage.getItem("high-contrast") === "true",
    dyslexiaFriendly: localStorage.getItem("dyslexia-friendly") === "true",
    colorBlindMode: localStorage.getItem("colorblind-mode") === "true",
    colorBlindType: localStorage.getItem("colorblind-type") ?? "protanomaly",
    appearance: localStorage.getItem("theme") || "light",
    showDropdown: localStorage.getItem("show-dropdown") === "true",
    autoCurrency: localStorage.getItem(AUTO_CURRENCY_KEY) === "true",
  };
}
const defaultSettings: SettingsState = {
  currency: "PKR",
  fontSize: "normal",
  highContrast: false,
  dyslexiaFriendly: false,
  colorBlindMode: false,
  colorBlindType: "protanomaly",
  appearance: "light",
  showDropdown: false,
  autoCurrency: false,
};

function writeLocalStorage(s: SettingsState) {
  localStorage.setItem("currency", s.currency);
  localStorage.setItem("font-size", s.fontSize);
  localStorage.setItem("high-contrast", String(s.highContrast));
  localStorage.setItem("dyslexia-friendly", String(s.dyslexiaFriendly));
  localStorage.setItem("colorblind-mode", String(s.colorBlindMode));
  localStorage.setItem("colorblind-type", s.colorBlindType);
  localStorage.setItem("show-dropdown", String(s.showDropdown));
}

const currencies: Currency[] = [
  { code: "USD", label: "US Dollar", icon: DollarSign },
  { code: "PKR", label: "پاکستانی روپیہ", icon: Coins },
  { code: "CAD", label: "Canadian Dollar", icon: BadgeCent },
  { code: "JPY", label: "日本円", icon: JapaneseYen },
  { code: "CNY", label: "人民币", icon: JapaneseYen },
  { code: "EUR", label: "Euro", icon: Euro },
  { code: "GBP", label: "Pound sterling", icon: PoundSterling },
  { code: "SAR", label: "الریال اسعودی", icon: Coins },
];

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  // `saved` = last persisted state. `current` = what the user sees in the dialog.
  const [saved, setSaved] = useState<SettingsState>(readLocalStorage);
  const [current, setCurrent] = useState<SettingsState>(readLocalStorage);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
  const [showAutoCurrencyConfirm, setShowAutoCurrencyConfirm] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(current);

  const reset = (persist = false) => {
    setCurrent(defaultSettings);

    // immediately reflect in UI preview (same behavior as patch)
    const sizes: Record<string, string> = {
      small: "90%",
      normal: "100%",
      large: "115%",
      xlarge: "130%",
    };

    document.documentElement.style.fontSize =
      sizes[defaultSettings.fontSize] ?? "100%";

    document.documentElement.classList.toggle(
      "high-contrast",
      defaultSettings.highContrast
    );

    document.documentElement.classList.toggle(
      "dyslexia-friendly",
      defaultSettings.dyslexiaFriendly
    );

    document.documentElement.classList.toggle(
      "colorblind-mode",
      defaultSettings.colorBlindMode
    );

    const prefix = "colorblind-";

    Array.from(document.documentElement.classList).forEach((c) => {
      if (c.startsWith(prefix)) {
        document.documentElement.classList.remove(c);
      }
    });

    if (defaultSettings.colorBlindMode) {
      document.documentElement.classList.add(
        `${prefix}${defaultSettings.colorBlindType}`
      );
    }

    const existingFont = document.querySelector("#dyslexia-font");
    existingFont?.remove();

    if (persist) {
      writeLocalStorage(defaultSettings);
      dispatchCurrencyEvent();

      if (user) {
        supabase.from("user_settings").upsert(
          {
            user_id: user.id,
            currency: defaultSettings.currency,
            font_size: defaultSettings.fontSize,
            high_contrast: defaultSettings.highContrast,
            dyslexia_friendly: defaultSettings.dyslexiaFriendly,
            colorblind_mode: defaultSettings.colorBlindMode,
            colorblind_type: defaultSettings.colorBlindType,
            appearence: defaultSettings.appearance,
            show_dropdown: defaultSettings.showDropdown,
          },
          { onConflict: "user_id" }
        );
      }

      setSaved(defaultSettings);
    }
  };

  // Re-sync when dialog opens so stale state is never shown.
  useEffect(() => {
    if (open) {
      const fresh = readLocalStorage();
      setSaved(fresh);
      setCurrent(fresh);
    }
  }, [open]);

  // ── DOM side-effects (live preview while dialog is open) ────────────────────

  useEffect(() => {
    const sizes: Record<string, string> = {
      small: "90%",
      normal: "100%",
      large: "115%",
      xlarge: "130%",
    };
    document.documentElement.style.fontSize = sizes[current.fontSize] ?? "100%";
  }, [current.fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle("colorblind-mode", current.colorBlindMode);
  }, [current.colorBlindMode]);

  useEffect(() => {
    const prefix = "colorblind-";
    document.documentElement.classList.forEach((c) => {
      if (c.startsWith(prefix)) document.documentElement.classList.remove(c);
    });
    if (current.colorBlindMode) {
      document.documentElement.classList.add(`${prefix}${current.colorBlindType}`);
    }
  }, [current.colorBlindType, current.colorBlindMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", current.highContrast);
  }, [current.highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle("dyslexia-friendly", current.dyslexiaFriendly);
    if (current.dyslexiaFriendly && !document.querySelector("#dyslexia-font")) {
      const link = document.createElement("link");
      link.id = "dyslexia-font";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap";
      document.head.appendChild(link);
    }
  }, [current.dyslexiaFriendly]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const patch = (partial: Partial<SettingsState>) =>
    setCurrent((prev) => ({ ...prev, ...partial }));

  const handleAutoCurrencyToggle = (checked: boolean) => {
    if (checked) {
      setShowAutoCurrencyConfirm(true);
    } else {
      localStorage.setItem(AUTO_CURRENCY_KEY, "false");
      patch({ autoCurrency: false });
    }
  };

  const confirmAutoCurrency = async () => {
    setShowAutoCurrencyConfirm(false);
    setIsAutoDetecting(true);
    localStorage.setItem(AUTO_CURRENCY_KEY, "true");
    patch({ autoCurrency: true });

    const detected = await fetchUserCurrency();
    if (detected) {
      localStorage.setItem("currency", detected);
      patch({ currency: detected });
      dispatchCurrencyEvent();
    }
    setIsAutoDetecting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    // 1. Always persist to localStorage.
    writeLocalStorage(current);
    dispatchCurrencyEvent();

    // 2. Persist to Supabase only for authenticated users.
    if (user) {
      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          currency: current.currency,
          font_size: current.fontSize,
          high_contrast: current.highContrast,
          dyslexia_friendly: current.dyslexiaFriendly,
          colorblind_mode: current.colorBlindMode,
          colorblind_type: current.colorBlindType,
          appearence: current.appearance,
          show_dropdown: current.showDropdown,
          autoselect_currency: current.autoCurrency
        },
        { onConflict: "user_id" }
      );
    }

    setSaved(current);
    setIsSaving(false);
    setShowUnsavedAlert(false);
    onOpenChange(false);
  };

  // Discard in-dialog changes and restore DOM to last saved state.
  const handleCloseNow = () => {
    setCurrent(saved); // triggers useEffects → DOM reverts
    setShowUnsavedAlert(false);
    onOpenChange(false);
  };

  // Intercept the dialog's own close triggers (X button, backdrop click, Escape).
  const handleOpenChange = (next: boolean) => {
    // Block ALL closing while saving
    if (!next && isSaving) {
      return;
    }

    // Show unsaved warning
    if (!next && isDirty) {
      setShowUnsavedAlert(true);
      return;
    }

    onOpenChange(next);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg rounded-2xl overflow-hidden p-0">
          {/* ── Header ── */}
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
            <DialogHeader className="px-5 py-4 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Settings
              </DialogTitle>

              <DialogDescription className="space-y-2 text-sm">
                <span>Customize your experience.</span>

                {!user && (
                  <span className="inline-flex flex-wrap items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    <span>Changes are saved to this device only.</span>
                    <span className="text-muted-foreground">
                      Sign in to enable cross-device sync.
                    </span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ── Body ── */}
          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 pb-4 pt-2">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <AppearanceSection onThemeChange={(v) => patch({ appearance: v })} />
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <CurrencySection
                currencies={currencies}
                selectedCurrency={current.currency}
                onCurrencyChange={(code) => patch({ currency: code })}
              />
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Header Dropdown</span>
                  <p className="text-xs text-muted-foreground">
                    Show currency selector in header for quick switching
                  </p>
                </div>
                <Switch
                  checked={current.showDropdown}
                  onCheckedChange={(v) => patch({ showDropdown: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">
                    Auto-detect
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {isAutoDetecting
                      ? "Determining your region…"
                      : "Automatically select currency based on your region"}
                  </p>
                </div>
                <Switch
                  checked={current.autoCurrency}
                  onCheckedChange={handleAutoCurrencyToggle}
                  disabled={isAutoDetecting}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <AccessibilitySection
                fontSize={current.fontSize}
                onFontSizeChange={(v) => patch({ fontSize: v })}
                highContrast={current.highContrast}
                onHighContrastChange={(v) => patch({ highContrast: v })}
                dyslexiaFriendly={current.dyslexiaFriendly}
                onDyslexiaFriendlyChange={(v) => patch({ dyslexiaFriendly: v })}
                colorBlindMode={current.colorBlindMode}
                onColorBlindModeChange={(v) => patch({ colorBlindMode: v })}
                colorBlindType={current.colorBlindType}
                onColorBlindTypeChange={(v) => patch({ colorBlindType: v })}
              />
            </div>
          </div>

          {/* ── Footer with Save ── */}
          <div className="border-t bg-background px-4 py-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="outline" onClick={() => { reset(true); setTimeout(handleCloseNow, 1900) }} disabled={isSaving}>
              Reset Settings
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || isSaving || isAutoDetecting} variant={!isDirty || isSaving || isAutoDetecting ? "ghost" : "default"}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />Saving...</> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes. Closing now will discard modifications.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={handleCloseNow}>
              Close now
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || isSaving} variant={!isDirty || isSaving ? "ghost" : "default"}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />Saving...</> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAutoCurrencyConfirm} onOpenChange={setShowAutoCurrencyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-detect Currency?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use your IP address to detect your approximate region
              and automatically select a suitable currency. The approximate region data will not be stored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoCurrency}>
              Yes, detect my currency
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}