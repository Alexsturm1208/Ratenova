import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { computeTotals } from '@/lib/services';
import type { Debt } from '@/types';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get('id');
  if (!userId) {
    return NextResponse.json({ error: 'User ID erforderlich.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Parallel fetch all customer data
    const [profileRes, debtsRes, paymentsRes, agreementsRes] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).single(),
      admin.from('debts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      admin.from('payments').select('*').eq('user_id', userId).order('date', { ascending: false }),
      admin.from('agreements').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (profileRes.error) {
      return NextResponse.json({ error: 'Kunde nicht gefunden.' }, { status: 404 });
    }

    const debts = (debtsRes.data ?? []) as Debt[];
    const kpis = computeTotals(debts);

    return NextResponse.json({
      profile: profileRes.data,
      kpis,
      debts,
      payments: paymentsRes.data ?? [],
      agreements: agreementsRes.data ?? [],
    });
  } catch (e: any) {
    const msg = e?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')
      ? 'Admin-Konfiguration fehlt (SUPABASE_SERVICE_ROLE_KEY).'
      : 'Interner Fehler.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
