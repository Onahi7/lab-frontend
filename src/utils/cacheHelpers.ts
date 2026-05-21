import { db } from '@/services/offlineDb';

const RESULT_DRAFT_PREFIX = 'result-draft:';

export async function clearBrowserAppCache(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  } catch {
    // Ignore browsers/environments without Cache API access.
  }

  try {
    await db.delete();
  } catch {
    // Ignore IndexedDB deletion errors.
  }
}

export function clearResultDraft(orderId?: string): void {
  if (!orderId) return;
  localStorage.removeItem(`${RESULT_DRAFT_PREFIX}${orderId}`);
}

export function getResultDraft(orderId?: string): Record<string, unknown> | null {
  if (!orderId) return null;

  try {
    const raw = localStorage.getItem(`${RESULT_DRAFT_PREFIX}${orderId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function countResultDraftKeys(orderId?: string): number {
  const draft = getResultDraft(orderId);
  return draft ? Object.keys(draft).length : 0;
}
