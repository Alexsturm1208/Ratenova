'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass }),
    });

    if (res.ok) {
      router.push('/admin/panel');
    } else {
      const data = await res.json();
      setError(data.error || 'Login fehlgeschlagen.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl">🔐</span>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-sm text-gray-500">Ratenova Support-Zugang</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Benutzername</label>
              <input type="text" value={user} onChange={e => setUser(e.target.value)} required autoComplete="off"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Passwort</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="off"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 transition disabled:opacity-50">
              {loading ? 'Prüfe...' : 'Admin Login'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          {process.env.NODE_ENV === 'development' ? 'DEV: master/master erlaubt' : 'Nur autorisierter Zugang'}
        </p>
      </div>
    </div>
  );
}
