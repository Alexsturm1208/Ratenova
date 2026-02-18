import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  // Verify admin session
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Suchbegriff zu kurz (min. 2 Zeichen).' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Search by email (partial match) or exact user_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

    let query = admin.from('profiles').select('*');

    if (isUUID) {
      query = query.eq('id', q);
    } else {
      query = query.ilike('email', `%${q}%`);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Admin search error:', error);
      return NextResponse.json({ error: 'Suche fehlgeschlagen.' }, { status: 500 });
    }

    return NextResponse.json({ customers: data ?? [] });
  } catch (e: any) {
    const msg = e?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')
      ? 'Admin-Konfiguration fehlt (SUPABASE_SERVICE_ROLE_KEY).'
      : 'Interner Fehler.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
