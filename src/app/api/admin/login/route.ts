import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, createAdminToken, setAdminCookie } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { user, pass } = await request.json();

    if (!user || !pass || typeof user !== 'string' || typeof pass !== 'string') {
      return NextResponse.json({ error: 'Benutzername und Passwort erforderlich.' }, { status: 400 });
    }

    if (!validateAdminCredentials(user, pass)) {
      return NextResponse.json({ error: 'Ungültige Zugangsdaten.' }, { status: 401 });
    }

    const token = await createAdminToken();
    await setAdminCookie(token);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Interner Fehler.' }, { status: 500 });
  }
}
