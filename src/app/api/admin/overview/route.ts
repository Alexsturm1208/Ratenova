import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(_request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const [listRes, freeCountRes, premiumCountRes] = await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'free'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'premium'),
    ]);

    const customers = listRes.data ?? [];
    const free = freeCountRes.count ?? 0;
    const premium = premiumCountRes.count ?? 0;
    const total = free + premium;

    return NextResponse.json({
      stats: { total, free, premium },
      customers,
    });
  } catch (e: any) {
    const msg = e?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')
      ? 'Admin-Konfiguration fehlt (SUPABASE_SERVICE_ROLE_KEY).'
      : 'Interner Fehler.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
