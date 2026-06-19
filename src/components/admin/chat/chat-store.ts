export const STORAGE_KEY = "ai-messages";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: ChatMessage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function clearMessages(): void {
  localStorage.removeItem(STORAGE_KEY);
}
