import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const { action, userId, plan, premiumUntil } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'Fehlende Parameter.' }, { status: 400 });
    }

    const admin = createAdminClient();

    switch (action) {
      case 'set_plan': {
        if (!['free', 'premium'].includes(plan)) {
          return NextResponse.json({ error: 'Ungültiger Plan.' }, { status: 400 });
        }
        const { error } = await admin
          .from('profiles')
          .update({
            plan,
            premium_until: plan === 'premium' ? premiumUntil || null : null,
          })
          .eq('id', userId);
        if (error) return NextResponse.json({ error: 'Update fehlgeschlagen.' }, { status: 500 });
        return NextResponse.json({ ok: true, message: `Plan auf ${plan} gesetzt.` });
      }

      case 'export_data': {
        // Export all customer data as JSON
        const [debts, payments, agreements, profile] = await Promise.all([
          admin.from('debts').select('*').eq('user_id', userId),
          admin.from('payments').select('*').eq('user_id', userId),
          admin.from('agreements').select('*').eq('user_id', userId),
          admin.from('profiles').select('*').eq('id', userId).single(),
        ]);
        return NextResponse.json({
          export: {
            profile: profile.data,
            debts: debts.data ?? [],
            payments: payments.data ?? [],
            agreements: agreements.data ?? [],
            exported_at: new Date().toISOString(),
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
    }
  } catch (e: any) {
    const msg = e?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')
      ? 'Admin-Konfiguration fehlt (SUPABASE_SERVICE_ROLE_KEY).'
      : 'Interner Fehler.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
