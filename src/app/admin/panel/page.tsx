'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';

export default function AdminPanelPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [overview, setOverview] = useState<{ stats: { total: number; free: number; premium: number }; customers: Profile[] } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError('');

    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setResults(data.customers || []);
    }
    setSearched(true);
    setLoading(false);
  }

  useEffect(() => {
    async function loadOverview() {
      setOverviewLoading(true);
      setOverviewError('');
      try {
        const res = await fetch('/api/admin/overview');
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        if (data.error) {
          setOverviewError(data.error);
        } else {
          setOverview(data);
        }
      } catch {
        setOverviewError('Kundenübersicht konnte nicht geladen werden.');
      } finally {
        setOverviewLoading(false);
      }
    }
    loadOverview();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-sm text-gray-500">Kundensuche & Verwaltung</p>
            </div>
          </div>
          <button onClick={() => router.push('/admin/login')}
            className="text-sm text-gray-500 hover:text-gray-300 transition">Abmelden</button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="E-Mail oder User-ID suchen..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button type="submit" disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            {loading ? '...' : 'Suchen'}
          </button>
        </form>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Overview */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Kundenübersicht</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gesamt</p>
              <p className="text-xl font-bold">{overview?.stats.total ?? '–'}</p>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Free</p>
              <p className="text-xl font-bold text-gray-300">{overview?.stats.free ?? '–'}</p>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Premium</p>
              <p className="text-xl font-bold text-amber-400">{overview?.stats.premium ?? '–'}</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {overviewLoading && (
              <div className="p-6 text-sm text-gray-500">Lade Kundenübersicht...</div>
            )}
            {!overviewLoading && overviewError && (
              <div className="p-6 text-sm text-red-400">{overviewError}</div>
            )}
            {!overviewLoading && !overviewError && overview && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left px-4 py-3">E-Mail</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Plan</th>
                    <th className="text-left px-4 py-3">Erstellt</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {overview.customers.map(c => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 font-mono text-xs">{c.email}</td>
                      <td className="px-4 py-3">{c.name || '–'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.plan === 'premium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/admin/customers/${c.id}`)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
                        >
                          Kundenakte →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {overview.customers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                        Noch keine Kunden vorhanden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Suchergebnisse */}
        {searched && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {results.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Keine Kunden gefunden.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left px-4 py-3">E-Mail</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Plan</th>
                    <th className="text-left px-4 py-3">Erstellt</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(c => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 font-mono text-xs">{c.email}</td>
                      <td className="px-4 py-3">{c.name || '–'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.plan === 'premium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/admin/customers/${c.id}`)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
                        >
                          Kundenakte →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
