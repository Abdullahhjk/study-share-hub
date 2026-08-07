import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Percent, Scale, Coins } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface PlatformSettingsInfoProps {
  userId: string;
}

export function PlatformSettingsInfo({ userId }: PlatformSettingsInfoProps) {
  const { formatPrice, currency } = useCurrency();
  const { data: settings, isLoading } = usePlatformSettings(userId);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Coins className="h-5 w-5" />
          Your Platform Settings
        </CardTitle>
        <CardDescription>
          Settings assigned to you by the admin for pricing and commission.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !settings ? (
          <p className="text-sm text-muted-foreground">
            No platform settings have been assigned to your account yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> Commission Rate
                </p>
                <p className="text-xl font-semibold">{settings.commission}%</p>
                <p className="text-[11px] text-muted-foreground">
                  Taken from each successful paid note sale.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" /> Settings Currency
                </p>
                <p className="text-xl font-semibold">{settings.code}</p>
                <p className="text-[11px] text-muted-foreground">
                  Currency the admin configured these limits in.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-1 sm:col-span-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> Note Price Range
                </p>
                <p className="text-xl font-semibold">
                  {formatPrice(settings.min_price)}
                  <span className="text-muted-foreground mx-2">—</span>
                  {formatPrice(settings.max_price)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px]">
                    Shown in {currency}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground">
                    Minimum and maximum price teachers can set for notes.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
