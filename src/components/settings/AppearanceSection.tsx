import { Sun, Moon, Palette, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function AppearanceSection({ onThemeChange }) {
  const { theme, setTheme } = useTheme();

  return (
    <section>
      <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4" />
        Appearance
      </h3>
      <div className="rounded-xl border p-4 space-y-4">
        <p className="text-xs text-muted-foreground">Choose your preferred theme mode</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "light" as const, icon: Sun, label: "Light" },
            { value: "dark" as const, icon: Moon, label: "Dark" },
          ].map(({ value, icon: Icon, label }) => (
            <Button
              key={value}
              variant={theme === value ? "default" : "outline"}
              size="sm"
              onClick={() => { onThemeChange(value); setTheme(value) }}
              className="flex flex-col items-center gap-1.5 h-auto py-3"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
