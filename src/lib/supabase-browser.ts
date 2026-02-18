// ============================================================
// Supabase Client — Browser (client-side, uses anon key + RLS)
// ============================================================
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    const stub = {
      auth: {
        async signInWithPassword() {
          return { error: { message: 'Supabase nicht konfiguriert' } };
        },
        async signOut() {
          return { error: null };
        },
      },
      from() {
        return {
          select: async () => ({ data: null, error: { message: 'Supabase nicht konfiguriert' } }),
          insert: async () => ({ data: null, error: { message: 'Supabase nicht konfiguriert' } }),
          update: async () => ({ data: null, error: { message: 'Supabase nicht konfiguriert' } }),
          delete: async () => ({ data: null, error: { message: 'Supabase nicht konfiguriert' } }),
          eq() { return this; },
          order() { return this; },
          single() { return this; },
        } as any;
      },
    } as any;
    return stub;
  }

  return createBrowserClient(url, anon);
}
