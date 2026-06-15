export const MAX_METHODS = 5;

export const MOBILE_WALLETS = new Set(["EasyPaisa", "JazzCash"]);

export function categorizeBank(bankName: string): "wallet" | "islamic" {
  return MOBILE_WALLETS.has(bankName) ? "wallet" : "islamic";
}

export function isMobileWallet(bankName: string): boolean {
  return MOBILE_WALLETS.has(bankName);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function saveRequestId(id: string) {
  try {
    const existing = JSON.parse(localStorage.getItem("requestIds") ?? "[]");
    if (!existing.includes(id)) {
      existing.push(id);
      localStorage.setItem("requestIds", JSON.stringify(existing));
    }
  } catch {
    localStorage.setItem("requestIds", JSON.stringify([id]));
  }
}
