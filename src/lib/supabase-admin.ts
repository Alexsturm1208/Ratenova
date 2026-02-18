// ============================================================
// Supabase Client — Admin (Service Role, bypasses RLS)
// ONLY used in API routes / Server Actions for admin operations
// NEVER import this in client components or pages
// ============================================================
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY — admin functions are unavailable.');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
