// ============================================================
// Supabase Client — Server (SSR, uses anon key + RLS via cookies)
// ============================================================
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    const stub = {
      auth: {
        async getUser() {
          return { data: { user: null } };
        }
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
          selectReturn: undefined,
        } as any;
      }
    } as any;
    return stub;
  }

  return createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
          }
        },
      },
    }
  );
}
