export const CURRENCY_STORAGE_KEY = "currency";
export const SHOW_DROPDOWN_KEY = "show-dropdown";
export const AUTO_CURRENCY_KEY = "auto-currency";
export const CURRENCY_EVENT = "currency-changed";

const countryCurrencyMap: Record<string, string> = {
  US: "USD",
  PK: "PKR",
  CA: "CAD",
  JP: "JPY",
  CN: "CNY",
  GB: "GBP",
  SA: "SAR",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", PT: "EUR",
  GR: "EUR", LU: "EUR", EE: "EUR", SK: "EUR", SI: "EUR",
  LT: "EUR", LV: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
};

export async function fetchUserCurrency(): Promise<string | null> {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const { ip } = await ipRes.json();

    const locRes = await fetch(
      `https://api.apilayer.com/ip_to_location/${ip}`,
      {
        headers: { apikey: import.meta.env.VITE_IP_TO_LOCATION_API_KEY || "" },
      }
    );
    const location = await locRes.json();

    const countryCode: string | undefined =
      location.country_code || location.country;
    return countryCode ? (countryCurrencyMap[countryCode] ?? null) : null;
  } catch {
    return null;
  }
}

export const currencyConfigs: Record<string, { label: string; symbol: string; decimals: number }> = {
  USD: { label: "US Dollar", symbol: "$", decimals: 2 },
  PKR: { label: "پاکستانی روپیہ", symbol: "PKR", decimals: 2 },
  CAD: { label: "Canadian Dollar", symbol: "C$", decimals: 2 },
  JPY: { label: "日本円", symbol: "¥", decimals: 0 },
  CNY: { label: "人民币", symbol: "¥", decimals: 2 },
  EUR: { label: "Euro", symbol: "€", decimals: 2 },
  GBP: { label: "Pound sterling", symbol: "£", decimals: 2 },
  SAR: { label: "الریال اسعودی", symbol: "SAR", decimals: 2 },
};

export function getStoredCurrency(): string {
  return localStorage.getItem(CURRENCY_STORAGE_KEY) ?? "PKR";
}

export function getCurrencySymbol(code: string): string {
  return currencyConfigs[code]?.symbol ?? code;
}

export function formatAmount(amount: number, code: string): string {
  const config = currencyConfigs[code];
  const decimals = config?.decimals ?? 2;
  const symbol = config?.symbol ?? code;
  const formatted = amount.toFixed(decimals);

  if (code === "PKR" || code === "SAR") {
    return `${symbol} ${formatted}`;
  }

  return `${symbol}${formatted}`;
}

export function dispatchCurrencyEvent(): void {
  window.dispatchEvent(new CustomEvent(CURRENCY_EVENT));
}
