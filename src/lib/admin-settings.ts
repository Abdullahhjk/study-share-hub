const STORAGE_KEY = "scholarshare_admin_settings";

export interface AdminSettings {
  taxRate: number;
  currency: string;
  minNotePrice: number;
  maxNotePrice: number;
}

const DEFAULTS: AdminSettings = {
  taxRate: 0.15,
  currency: "PKR",
  minNotePrice: 0,
  maxNotePrice: 100000,
};

export function getAdminSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function updateAdminSettings(partial: Partial<AdminSettings>): AdminSettings {
  const current = getAdminSettings();
  const updated = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("admin-settings-changed"));
  return updated;
}

export function getTaxRate(): number {
  return getAdminSettings().taxRate;
}
