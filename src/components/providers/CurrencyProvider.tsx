import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  CURRENCY_EVENT,
  getStoredCurrency,
  formatAmount,
} from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency, CurrencyContext } from "@/hooks/useCurrency";

const FX_STORAGE_KEY = "fx_rates_cache";
const FX_TTL_MS = 24 * 60 * 60 * 1000;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<string>(getStoredCurrency);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  const loadRatesFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(FX_STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed?.rates || !parsed?.fetched_at) return null;

      const isExpired = Date.now() - parsed.fetched_at > FX_TTL_MS;
      if (isExpired) return null;

      return parsed.rates as Record<string, number>;
    } catch {
      return null;
    }
  }, []);

  const saveRatesToStorage = useCallback((rates: Record<string, number>) => {
    try {
      localStorage.setItem(
        FX_STORAGE_KEY,
        JSON.stringify({
          rates,
          fetched_at: Date.now(),
        })
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchRates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fx_rates")
        .select("rates")
        .eq("base_currency", "PKR")
        .single();

      if (error || !data?.rates) {
        setRates({ PKR: 1 });
        return;
      }

      const fetchedRates = data.rates as Record<string, number>;

      saveRatesToStorage(fetchedRates);
      setRates(fetchedRates);
    } catch {
      setRates({ PKR: 1 });
    } finally {
      setIsLoadingRates(false);
    }
  }, [saveRatesToStorage]);

  useEffect(() => {
    const cached = loadRatesFromStorage();

    if (cached) {
      setRates(cached);
      setIsLoadingRates(false);
      return;
    }

    fetchRates();
  }, [loadRatesFromStorage, fetchRates]);

  useEffect(() => {
    function handleCurrencyChange() {
      setCurrency(getStoredCurrency());
    }

    window.addEventListener(CURRENCY_EVENT, handleCurrencyChange);
    window.addEventListener("storage", handleCurrencyChange);

    return () => {
      window.removeEventListener(CURRENCY_EVENT, handleCurrencyChange);
      window.removeEventListener("storage", handleCurrencyChange);
    };
  }, []);

  const convertPrice = useCallback(
    (amountInPKR: number): number => {
      if (!rates) return amountInPKR;

      const key = `PKR${currency}`;
      const rate = rates[key];

      if (!rate) return amountInPKR;

      return amountInPKR * rate;
    },
    [rates, currency]
  );

  const convertToPKR = useCallback(
    (amountInSelected: number): number => {
      if (!rates) return amountInSelected;

      const key = `PKR${currency}`;
      const rate = rates[key];

      if (!rate) return amountInSelected;

      return amountInSelected / rate;
    },
    [rates, currency]
  );

  const formatPrice = useCallback(
    (amountInPKR: number): string => {
      const converted = convertPrice(amountInPKR);
      return formatAmount(converted, currency);
    },
    [convertPrice, currency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        convertPrice,
        convertToPKR,
        formatPrice,
        isLoadingRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}