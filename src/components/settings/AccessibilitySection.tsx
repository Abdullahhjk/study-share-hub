import { Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const FONT_SIZES = [
  { value: "small", label: "Small", scale: "90%" },
  { value: "normal", label: "Normal", scale: "100%" },
  { value: "large", label: "Large", scale: "115%" },
  { value: "xlarge", label: "X-Large", scale: "130%" },
];

const COLOR_BLIND_GROUPS = [
  {
    label: "Anomalous Trichromacy",
    types: [
      { value: "protanomaly", name: "Protanomaly", desc: "Red-weak" },
      { value: "deuteranomaly", name: "Deuteranomaly", desc: "Green-weak" },
      { value: "tritanomaly", name: "Tritanomaly", desc: "Blue-weak" },
    ],
  },
  {
    label: "Dichromacy",
    types: [
      { value: "protanopia", name: "Protanopia", desc: "Red-blind" },
      { value: "deuteranopia", name: "Deuteranopia", desc: "Green-blind" },
      { value: "tritanopia", name: "Tritanopia", desc: "Blue-blind" },
    ],
  },
  {
    label: "Monochromacy",
    types: [
      { value: "achromatopsia", name: "Achromatopsia", desc: "Complete" },
      { value: "achromatomaly", name: "Achromatomaly", desc: "Partial" },
      { value: "blue-cone", name: "Blue Cone", desc: "Rare cone disorder" },
    ],
  },
];

interface AccessibilitySectionProps {
  fontSize: string;
  onFontSizeChange: (size: string) => void;
  highContrast: boolean;
  onHighContrastChange: (val: boolean) => void;
  dyslexiaFriendly: boolean;
  onDyslexiaFriendlyChange: (val: boolean) => void;
  colorBlindMode: boolean;
  onColorBlindModeChange: (val: boolean) => void;
  colorBlindType: string;
  onColorBlindTypeChange: (val: string) => void;
}

export function AccessibilitySection({
  fontSize,
  onFontSizeChange,
  highContrast,
  onHighContrastChange,
  dyslexiaFriendly,
  onDyslexiaFriendlyChange,
  colorBlindMode,
  onColorBlindModeChange,
  colorBlindType,
  onColorBlindTypeChange,
}: AccessibilitySectionProps) {
  const fontSizeIndex = FONT_SIZES.findIndex((s) => s.value === fontSize);
  const sliderValue = fontSizeIndex >= 0 ? fontSizeIndex : 1;

  return (
    <section>
      <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
        <Eye className="h-4 w-4" />
        Accessibility
      </h3>
      <div className="rounded-xl border p-4 space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">Adjust the text size across the interface.</p>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {FONT_SIZES.find((s) => s.value === fontSize)?.scale}
            </Badge>
          </div>
          <Slider
            value={[sliderValue]}
            onValueChange={([val]) => onFontSizeChange(FONT_SIZES[val]?.value || "normal")}
            min={0}
            max={FONT_SIZES.length - 1}
            step={1}
            className="w-full"
          />
          <div className="mt-1.5 grid grid-cols-4 gap-1">
            {FONT_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onFontSizeChange(s.value)}
                className={`min-w-0 truncate rounded px-1 text-[10px] transition-colors ${fontSize === s.value
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor="high-contrast" className="text-sm font-medium">
                High Contrast Mode
              </Label>
              <p className="text-xs text-muted-foreground">Increase contrast for better visibility.</p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={onHighContrastChange}
              className="shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor="dyslexia-font" className="text-sm font-medium">
                Dyslexia-friendly Font
              </Label>
              <p className="text-xs text-muted-foreground">Use a font designed for easier reading.</p>
            </div>
            <Switch
              id="dyslexia-font"
              checked={dyslexiaFriendly}
              onCheckedChange={onDyslexiaFriendlyChange}
              className="shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor="colorblind-mode" className="text-sm font-medium">
                Colorblind Mode
              </Label>

              <p className="text-xs text-muted-foreground">
                Adjust interface colors for improved color distinction.
              </p>
            </div>

            <Switch
              id="colorblind-mode"
              checked={colorBlindMode}
              onCheckedChange={onColorBlindModeChange}
              className="shrink-0"
            />
          </div>

          {colorBlindMode && (
            <div className="space-y-3 pt-1">
              {COLOR_BLIND_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {group.label}
                  </p>
                  <RadioGroup
                    value={colorBlindType}
                    onValueChange={onColorBlindTypeChange}
                    className="gap-1"
                  >
                    {group.types.map((type) => (
                      <div
                        key={type.value}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50 has-[[data-state=checked]]:bg-accent"
                      >
                        <RadioGroupItem
                          value={type.value}
                          id={type.value}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <Label
                          htmlFor={type.value}
                          className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-baseline gap-x-1.5 text-xs font-normal"
                        >
                          <span className="truncate">{type.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {type.desc}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
