'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AdminCustomerSummary } from '@/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';

const tabs = ['Profil', 'Schulden', 'Zahlungen', 'Vereinbarungen', 'Aktionen'];

export default function AdminCustomerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<AdminCustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Profil');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetch(`/api/admin/customer?id=${id}`)
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null; } return r.json(); })
      .then(d => { if (d?.error) setError(d.error); else if (d) setData(d); })
      .catch(() => setError('Laden fehlgeschlagen.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function setPlan(plan: string) {
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_plan', userId: id, plan }),
    });
    const d = await res.json();
    setActionMsg(d.message || d.error || 'Fertig');
    // Reload data
    const r = await fetch(`/api/admin/customer?id=${id}`);
    const nd = await r.json();
    if (!nd.error) setData(nd);
  }

  async function exportData() {
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export_data', userId: id }),
    });
    const d = await res.json();
    const blob = new Blob([JSON.stringify(d.export, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kundenakte-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMsg('Export heruntergeladen.');
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Lade Kundenakte...</div>;
  if (error || !data) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">{error || 'Kunde nicht gefunden.'}</div>;

  const { profile: p, kpis: k, debts, payments, agreements } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back + Header */}
        <button onClick={() => router.push('/admin/panel')} className="text-sm text-gray-500 hover:text-gray-300 mb-6 block">← Zurück zur Suche</button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-2xl font-bold text-blue-400">
            {(p.name || p.email)[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{p.name || p.email}</h1>
            <p className="text-sm text-gray-500 font-mono">{p.email} · {p.id.slice(0, 8)}...</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${p.plan === 'premium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>
            {p.plan.toUpperCase()}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { l: 'Gesamtschuld', v: fmt(k.originalTotal), c: 'text-white' },
            { l: 'Bezahlt', v: fmt(k.paidTotal), c: 'text-emerald-400' },
            { l: 'Restschuld', v: fmt(k.remaining), c: 'text-red-400' },
            { l: 'Rate/Mo', v: fmt(k.monthlyTotal), c: 'text-amber-400' },
          ].map(kpi => (
            <div key={kpi.l} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">{kpi.l}</p>
              <p className={`text-xl font-bold ${kpi.c}`}>{kpi.v}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition
                ${activeTab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Profil' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-3">
            {[
              { l: 'User ID', v: p.id },
              { l: 'E-Mail', v: p.email },
              { l: 'Name', v: p.name || '–' },
              { l: 'Plan', v: p.plan },
              { l: 'Premium bis', v: p.premium_until ? new Date(p.premium_until).toLocaleDateString('de-DE') : '–' },
              { l: 'Erstellt am', v: new Date(p.created_at).toLocaleString('de-DE') },
              { l: 'Schulden', v: `${k.debtCount} gesamt (${k.activeCount} aktiv, ${k.doneCount} erledigt)` },
              { l: 'Fortschritt', v: `${k.percentPaid}% getilgt` },
            ].map(r => (
              <div key={r.l} className="flex justify-between py-2 border-b border-gray-800/50 last:border-0">
                <span className="text-sm text-gray-400">{r.l}</span>
                <span className="text-sm font-semibold font-mono">{r.v}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Schulden' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <th className="text-left px-4 py-3"></th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-right px-4 py-3">Gesamt</th>
                <th className="text-right px-4 py-3">Bezahlt</th>
                <th className="text-right px-4 py-3">Offen</th>
                <th className="text-right px-4 py-3">Rate</th>
                <th className="text-left px-4 py-3">Fällig</th>
                <th className="text-left px-4 py-3">Gläubiger</th>
              </tr></thead>
              <tbody>
                {debts.map(d => (
                  <tr key={d.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                    <td className="px-4 py-2.5 text-lg">{d.emoji}</td>
                    <td className="px-4 py-2.5 font-semibold">{d.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(d.original_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{fmt(d.paid_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-400">{fmt(d.original_amount - d.paid_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(d.monthly_rate)}</td>
                    <td className="px-4 py-2.5 text-gray-400">{d.due_date || '–'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{d.creditor_name || '–'}</td>
                  </tr>
                ))}
                {debts.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Keine Schulden.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Zahlungen' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-right px-4 py-3">Betrag</th>
                <th className="text-left px-4 py-3">Schuld</th>
                <th className="text-left px-4 py-3">Notiz</th>
              </tr></thead>
              <tbody>
                {payments.map(p => {
                  const debt = debts.find(d => d.id === p.debt_id);
                  return (
                    <tr key={p.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                      <td className="px-4 py-2.5">{new Date(p.date).toLocaleDateString('de-DE')}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-400">{fmt(p.amount)}</td>
                      <td className="px-4 py-2.5">{debt ? `${debt.emoji} ${debt.name}` : p.debt_id.slice(0, 8)}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{p.note || '–'}</td>
                    </tr>
                  );
                })}
                {payments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Keine Zahlungen.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Vereinbarungen' && (
          <div className="space-y-3">
            {agreements.map(a => (
              <div key={a.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">{a.type}</span>
                  <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString('de-DE')}</span>
                </div>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-40 overflow-auto">{a.content.slice(0, 500)}{a.content.length > 500 ? '...' : ''}</pre>
              </div>
            ))}
            {agreements.length === 0 && <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center text-gray-500">Keine Vereinbarungen.</div>}
          </div>
        )}

        {activeTab === 'Aktionen' && (
          <div className="space-y-4">
            {actionMsg && <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-sm text-blue-400">{actionMsg}</div>}

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="font-bold mb-4">Plan verwalten</h3>
              <div className="flex gap-3">
                <button onClick={() => setPlan('free')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${p.plan === 'free' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
                  Free
                </button>
                <button onClick={() => setPlan('premium')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${p.plan === 'premium' ? 'bg-amber-600/30 border-amber-500/50 text-amber-400' : 'border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/30'}`}>
                  ⭐ Premium
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="font-bold mb-4">Datenexport</h3>
              <button onClick={exportData}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition">
                📥 Kundenakte als JSON exportieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
