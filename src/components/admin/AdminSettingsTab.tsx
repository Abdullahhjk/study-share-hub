import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw } from "lucide-react";
import { getAdminSettings, updateAdminSettings, type AdminSettings } from "@/lib/admin-settings";
import { toast } from "sonner";

const DEFAULTS: AdminSettings = {
  taxRate: 0.15,
  currency: "PKR",
  minNotePrice: 0,
  maxNotePrice: 100000,
};

export default function AdminSettingsTab() {
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const handler = () => {
      setSettings(getAdminSettings());
      setHasChanges(false);
    };
    window.addEventListener("admin-settings-changed", handler);
    return () => window.removeEventListener("admin-settings-changed", handler);
  }, []);

  const handleChange = (key: keyof AdminSettings, value: string) => {
    setSettings(prev => {
      const updated = { ...prev };
      if (key === "taxRate") {
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0 && num <= 1) updated[key] = num;
      } else if (key === "minNotePrice" || key === "maxNotePrice") {
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0) updated[key] = num;
      } else {
        updated[key] = value;
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (settings.taxRate < 0 || settings.taxRate > 1) {
      toast.error("Tax rate must be between 0 and 1");
      return;
    }
    if (settings.minNotePrice > settings.maxNotePrice) {
      toast.error("Min price cannot exceed max price");
      return;
    }
    updateAdminSettings(settings);
    setHasChanges(false);
    toast.success("Settings saved");
  };

  const handleReset = () => {
    setSettings({ ...DEFAULTS });
    updateAdminSettings(DEFAULTS);
    setHasChanges(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Platform Settings</CardTitle>
        <CardDescription>Configure platform-wide settings like commission rates and price limits.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Platform Commission Rate</Label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.taxRate}
                onChange={(e) => handleChange("taxRate", e.target.value)}
                className="w-full sm:max-w-[140px]"
              />

              <span className="text-sm text-muted-foreground">
                ({Math.round(settings.taxRate * 100)}%)
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Fraction of each sale taken as platform commission (0 to 1). Default:
              0.15 (15%)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Currency Code</Label>

            <Input
              value={settings.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full sm:max-w-[140px]"
              maxLength={3}
            />

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              ISO 4217 currency code. Default: PKR
            </p>
          </div>

          <div className="space-y-2">
            <Label>Minimum Note Price</Label>

            <Input
              type="number"
              step="1"
              min="0"
              value={settings.minNotePrice}
              onChange={(e) => handleChange("minNotePrice", e.target.value)}
              className="w-full sm:max-w-[180px]"
            />

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Minimum price teachers can set for notes. Default: 0
            </p>
          </div>

          <div className="space-y-2">
            <Label>Maximum Note Price</Label>

            <Input
              type="number"
              step="1"
              min="0"
              value={settings.maxNotePrice}
              onChange={(e) => handleChange("maxNotePrice", e.target.value)}
              className="w-full sm:max-w-[180px]"
            />

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Maximum price teachers can set for notes. Default: 100,000
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full sm:w-auto"
          >
            <Save className="mr-1 h-4 w-4" />
            Save Settings
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            Reset Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
