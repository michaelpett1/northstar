import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Lightweight Supabase client for server-side API routes.
 * Uses the anon key directly — no cookie-based auth needed.
 * Suitable for read-only public endpoints.
 */
export function createAPIClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient<Database>(url, key);
}
