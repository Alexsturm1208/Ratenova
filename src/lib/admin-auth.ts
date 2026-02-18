// ============================================================
// Admin Auth — Separate from Supabase user auth
// Uses signed JWT cookies for admin session
// DEV: master/master allowed, PROD: only ENV credentials
// ============================================================
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const ADMIN_COOKIE = 'sf_admin_token';
const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'dev-secret-change-in-production-32chars!'
);

/** Validate admin credentials against ENV (or dev defaults) */
export function validateAdminCredentials(user: string, pass: string): boolean {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // PROD: Only ENV credentials allowed
    const envUser = process.env.ADMIN_USER;
    const envPass = process.env.ADMIN_PASS;
    if (!envUser || !envPass) return false;
    if (user === 'master' && pass === 'master') return false; // Block default creds in prod
    return user === envUser && pass === envPass;
  }

  // DEV: Allow master/master OR ENV credentials
  if (user === 'master' && pass === 'master') return true;
  const envUser = process.env.ADMIN_USER;
  const envPass = process.env.ADMIN_PASS;
  if (envUser && envPass) return user === envUser && pass === envPass;
  return false;
}

/** Create a signed admin JWT token */
export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

/** Verify admin JWT from cookie — returns true if valid admin session */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/** Set admin cookie after successful login */
export async function setAdminCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });
}

/** Clear admin cookie */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
