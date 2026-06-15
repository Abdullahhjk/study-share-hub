import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface Currency {
  code: string;
  label: string;
  icon: LucideIcon;
}

interface CurrencySectionProps {
  currencies: Currency[];
  selectedCurrency: string;
  onCurrencyChange: (code: string) => void;
}

export function CurrencySection({ currencies, selectedCurrency, onCurrencyChange }: CurrencySectionProps) {
  return (
    <section>
      <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
        <CircleDollarSign className="h-4 w-4" />
        Currency
      </h3>
      <p className="text-xs text-muted-foreground mb-3">Choose your preferred currency for prices and orders.</p>
      <div className="space-y-2">
        {currencies.map((currency) => {
          const isSelected = selectedCurrency === currency.code;
          return (
            <Button
              key={currency.code}
              variant="outline"
              disabled={isSelected}
              onClick={() => {
                if (!isSelected) {
                  onCurrencyChange(currency.code);
                  toast.success("Currency updated", {
                    id: "currency-toast",
                    description: `${currency.label} (${currency.code}) is now active for all pricing`,
                  });
                }
              }}
              className={`
                h-auto min-h-[60px] w-full justify-start rounded-xl px-4 py-2.5
                transition-all duration-200 active:scale-[0.98]
                ${isSelected
                  ? "bg-muted text-muted-foreground border-primary cursor-not-allowed opacity-100 ring-1"
                  : "hover:bg-muted/40"
                }
              `}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-sm
                  ${isSelected
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border"
                  }
                `}>
                  <currency.icon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold">{currency.code}</span>
                    <span className="text-xs text-muted-foreground">{currency.label}</span>
                  </div>
                  {isSelected && (
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
