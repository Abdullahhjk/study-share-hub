const STORAGE_KEY = "student_request_ids";

export function getStoredRequestIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveRequestId(requestId: string) {
  const existing = getStoredRequestIds();
  if (!existing.includes(requestId)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, requestId]));
  }
}

export function removeRequestId(requestId: string) {
  const existing = getStoredRequestIds();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existing.filter((id) => id !== requestId))
  );
}

export function addMultipleRequestIds(requestIds: string[]): string[] {
  const existing = getStoredRequestIds();
  const newIds = requestIds.filter(id => !existing.includes(id));
  if (newIds.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, ...newIds]));
  }
  return newIds;
}
