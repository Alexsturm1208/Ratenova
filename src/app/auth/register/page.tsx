'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sf-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sf-em-d to-sf-em flex items-center justify-center text-xl shadow-lg shadow-sf-em/20 animate-glow">🕊️</div>
            <span className="text-2xl font-extrabold text-sf-t">Ratenova</span>
          </div>
          <p className="text-sf-tm text-sm">Erstelle dein kostenloses Konto.</p>
        </div>

        <div className="bg-sf-bg-c rounded-2xl p-8 border border-white/5">
          {success ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-lg font-bold text-sf-em mb-2">Willkommen bei Ratenova!</p>
              <p className="text-sm text-sf-tm">Du wirst weitergeleitet...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-1.5 tracking-wide">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
                  placeholder="Max Mustermann" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-1.5 tracking-wide">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
                  placeholder="name@beispiel.de" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-1.5 tracking-wide">Passwort (min. 8 Zeichen)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
                  placeholder="••••••••" />
              </div>
              {error && <div className="bg-sf-co/10 border border-sf-co/20 rounded-xl px-4 py-3 text-sm text-sf-co">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition disabled:opacity-50">
                {loading ? 'Registrieren...' : 'Kostenlos registrieren'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-sf-tm">
            Schon ein Konto?{' '}
            <Link href="/auth/login" className="text-sf-em font-semibold hover:underline">Anmelden</Link>
          </p>
        </div>

        <p className="text-center text-xs text-sf-tf mt-4">
          Free-Plan: bis zu 5 Schulden verwalten. Jederzeit upgraden.
        </p>
      </div>
    </div>
  );
}
