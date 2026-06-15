import { createContext, useContext } from "react";

export interface CurrencyContextType {
  currency: string;
  convertPrice: (amountInPKR: number) => number;
  convertToPKR: (amountInSelected: number) => number;
  formatPrice: (amountInPKR: number) => string;
  isLoadingRates: boolean;
}

export const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
