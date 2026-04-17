'use client';
import { useToastStore } from '@/lib/store/toastStore';

/**
 * Wraps a Supabase write with retry + error surfacing.
 *
 * - Retries up to `retries` times with exponential backoff (200ms, 400ms, 800ms).
 * - On final failure: logs to console AND shows an error toast so silent
 *   divergence between localStorage and Supabase stops being invisible.
 *
 * Use this instead of `.catch(err => console.error(...))` for any DB write
 * that mutates state the user will see.
 */
export async function syncWrite<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { retries?: number; silent?: boolean } = {}
): Promise<T | undefined> {
  const retries = opts.retries ?? 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
  }

  console.error(`[sync] ${label} failed after ${retries + 1} attempts:`, lastErr);
  if (!opts.silent && typeof window !== 'undefined') {
    try {
      useToastStore.getState().addToast(
        `Failed to sync: ${label}. Your change is saved locally but not in the database.`,
        'error'
      );
    } catch {
      // toast store may not be mounted — silent fail
    }
  }
  return undefined;
}
