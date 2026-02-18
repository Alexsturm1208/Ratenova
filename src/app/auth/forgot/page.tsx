'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sf-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sf-em-d to-sf-em flex items-center justify-center text-xl animate-glow">🕊️</div>
            <span className="text-2xl font-extrabold text-sf-t">SchuldenFrei</span>
          </div>
        </div>
        <div className="bg-sf-bg-c rounded-2xl p-8 border border-white/5">
          {sent ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-3">📧</p>
              <p className="font-bold text-sf-t mb-2">E-Mail gesendet!</p>
              <p className="text-sm text-sf-tm">Prüfe dein Postfach für den Reset-Link.</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <p className="text-sf-tm text-sm mb-4">Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.</p>
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-1.5">E-Mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
                  placeholder="name@beispiel.de" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition disabled:opacity-50">
                {loading ? 'Senden...' : 'Reset-Link senden'}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-sf-tm">
            <Link href="/auth/login" className="text-sf-em hover:underline">← Zurück zum Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
