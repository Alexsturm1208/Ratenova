'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LoginLogo from '../../../../Ratenova Logo_ mit Text.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-Mail oder Passwort ist falsch.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sf-bg px-4">
      <div className="text-center mb-8 w-full">
        <div className="mx-auto w-[420px] sm:w-[560px] md:w-[640px] lg:w-[720px] mb-2">
          <Image src={LoginLogo} alt="Ratenova" priority className="w-full h-auto drop-shadow-[0_12px_28px_rgba(34,197,94,0.25)]" />
        </div>
        <p className="text-sf-tm text-sm">Melde dich an, um fortzufahren.</p>
      </div>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-sf-bg-c rounded-2xl p-8 border border-white/5">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-sf-ts mb-1.5 tracking-wide">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
                placeholder="name@beispiel.de"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-sf-ts mb-1.5 tracking-wide">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-sf-co/10 border border-sf-co/20 rounded-xl px-4 py-3 text-sm text-sf-co">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/forgot" className="text-sm text-sf-em hover:underline">
              Passwort vergessen?
            </Link>
            <p className="text-sm text-sf-tm">
              Noch kein Konto?{' '}
              <Link href="/auth/register" className="text-sf-em font-semibold hover:underline">
                Registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
