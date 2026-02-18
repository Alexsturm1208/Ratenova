'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Debt, DebtInsert } from '@/types';
import { createClient } from '@/lib/supabase-browser';
import { createDebt } from '@/lib/services';
import DebtCard, { getDebtStatus, getDebtCategory } from '@/components/DebtCard';

const EMOJIS = ['📄', '⚡', '🏠', '🚗', '🏥', '🦷', '🪑', '📱', '🎓', '💳', '🏦', '👕'];

interface Props {
  debts: Debt[];
  userPlan: string;
  userId: string;
}

export default function DebtsClient({ debts, userPlan, userId }: Props) {
  const [filter, setFilter] = useState('all');
  const [catFilter, setCatFilter] = useState<'all' | 'kredit' | 'ratenkauf' | 'rechnung'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [emoji, setEmoji] = useState('📄');
  const router = useRouter();
  const supabase = createClient();

  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';
  const fmtDate = (d: string | null) => {
    if (!d) return '–';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('de-DE'); }
    catch { return d; }
  };
  const statusText = (d: Debt) => {
    const s = getDebtStatus(d);
    if (s === 'ok') return 'Aktuell';
    if (s === 'soon') return 'Bald fällig';
    if (s === 'today') return 'Heute fällig';
    if (s === 'overdue') return 'Überfällig';
    return 'Erledigt';
  };

  const filters = [
    { id: 'all', label: 'Alle', count: debts.length },
    { id: 'active', label: 'Aktiv', count: debts.filter(d => d.paid_amount < d.original_amount).length },
    { id: 'urgent', label: 'Dringend', count: debts.filter(d => { const s = getDebtStatus(d); return s === 'today' || s === 'overdue' || s === 'soon'; }).length },
    { id: 'done', label: 'Erledigt', count: debts.filter(d => d.paid_amount >= d.original_amount).length },
    { id: 'pending', label: 'In Klärung', count: debts.filter(d => getDebtStatus(d) === 'pending').length },
  ];

  const filtered = debts.filter(d => {
    if (filter === 'active') return d.paid_amount < d.original_amount;
    if (filter === 'urgent') { const s = getDebtStatus(d); return s === 'today' || s === 'overdue' || s === 'soon'; }
    if (filter === 'done') return d.paid_amount >= d.original_amount;
    if (filter === 'pending') return getDebtStatus(d) === 'pending';
    const cat = getDebtCategory(d);
    if (catFilter === 'kredit' && cat !== 'Kredit') return false;
    if (catFilter === 'ratenkauf' && cat !== 'Ratenkauf') return false;
    if (catFilter === 'rechnung' && cat !== 'Rechnung') return false;
    return true;
  });

  const atFreeLimit = userPlan === 'free' && debts.length >= 5;

  const catCounts = debts.reduce((acc, d) => {
    const c = getDebtCategory(d);
    acc.all++;
    if (c === 'Kredit') acc.kredit++;
    else if (c === 'Ratenkauf') acc.ratenkauf++;
    else acc.rechnung++;
    return acc;
  }, { all: 0, kredit: 0, ratenkauf: 0, rechnung: 0 });

  function handlePrintOverview() {
    if (userPlan === 'free') {
      setError('PDF-Export ist ein Premium-Feature. Upgrade auf Premium!');
      return;
    }
    const rows = filtered.map(d => {
      const remaining = d.original_amount - d.paid_amount;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;"><span style="font-size:18px;margin-right:8px">${d.emoji}</span>${d.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(d.original_amount)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(d.paid_amount)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:${remaining > 0 ? '600' : '400'}">${fmt(remaining)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(d.monthly_rate)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${fmtDate(d.due_date)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${statusText(d)}</td>
      </tr>`;
    }).join('');

    const totalOriginal = filtered.reduce((s, d) => s + d.original_amount, 0);
    const totalPaid = filtered.reduce((s, d) => s + d.paid_amount, 0);
    const totalRemaining = totalOriginal - totalPaid;
    const totalMonthly = filtered.filter(d => d.paid_amount < d.original_amount).reduce((s, d) => s + d.monthly_rate, 0);

    const now = new Date().toLocaleString('de-DE');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Verbindlichkeiten-Übersicht</title>
      <style>
        :root{--primary:#1e88e5;--text:#1a1a1a;--muted:#666}
        body{font-family:Inter,Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif;color:var(--text);max-width:900px;margin:40px auto;padding:0 20px}
        h1{font-size:22px;margin:0 0 6px}
        .sub{color:var(--muted);font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden}
        thead th{background:#f7f7f9;color:#333;font-size:12px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:10px 12px;border-bottom:1px solid #e6e6eb}
        tfoot td{background:#fafafa;font-weight:600}
        .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}
        .card{border:1px solid #eee;border-radius:12px;padding:12px;background:#fff}
        .label{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.04em}
        .value{font-size:18px;font-weight:800;color:var(--primary)}
        @media print{body{margin:0;padding:12px}}
      </style></head><body>
        <h1>Verbindlichkeiten-Übersicht</h1>
        <div class="sub">Erstellt am ${now} · ${filtered.length} Einträge</div>
        <div class="grid">
          <div class="card"><div class="label">Gesamtbetrag</div><div class="value">${fmt(totalOriginal)}</div></div>
          <div class="card"><div class="label">Bezahlt</div><div class="value">${fmt(totalPaid)}</div></div>
          <div class="card"><div class="label">Restverbindlichkeit</div><div class="value">${fmt(totalRemaining)}</div></div>
          <div class="card"><div class="label">Rate/Monat</div><div class="value">${fmt(totalMonthly)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th style="text-align:right">Gesamt</th>
              <th style="text-align:right">Bezahlt</th>
              <th style="text-align:right">Restverbindlichkeit</th>
              <th style="text-align:right">Rate/Monat</th>
              <th style="text-align:center">Fälligkeit</th>
              <th style="text-align:center">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td style="padding:12px">Summe</td>
              <td style="padding:12px;text-align:right">${fmt(totalOriginal)}</td>
              <td style="padding:12px;text-align:right">${fmt(totalPaid)}</td>
              <td style="padding:12px;text-align:right">${fmt(totalRemaining)}</td>
              <td style="padding:12px;text-align:right">${fmt(totalMonthly)}</td>
              <td></td><td></td>
            </tr>
          </tfoot>
        </table>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const input: DebtInsert = {
      name: fd.get('name') as string,
      emoji,
      original_amount: Number(fd.get('original_amount')),
      monthly_rate: Number(fd.get('monthly_rate')),
      plan_status: (fd.get('plan_status') as 'open' | 'negotiation' | 'rate') || 'open',
      due_date: (fd.get('due_date') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      creditor_name: (fd.get('creditor_name') as string) || undefined,
      creditor_address: (fd.get('creditor_address') as string) || undefined,
      creditor_phone: (fd.get('creditor_phone') as string) || undefined,
      creditor_email: (fd.get('creditor_email') as string) || undefined,
      bank_name: (fd.get('bank_name') as string) || undefined,
      bank_iban: (fd.get('bank_iban') as string) || undefined,
      bank_bic: (fd.get('bank_bic') as string) || undefined,
      bank_ref: (fd.get('bank_ref') as string) || undefined,
    };

    const result = await createDebt(supabase, userId, input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setShowAdd(false);
    setSaving(false);
    setEmoji('📄');
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Alle Verbindlichkeiten</h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrintOverview}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition
              ${userPlan === 'premium'
                ? 'text-white bg-gradient-to-r from-sf-em to-sf-em-d shadow-lg shadow-sf-em/25 hover:brightness-110'
                : 'text-sf-ts border-white/10 bg-transparent hover:bg-white/5'}`}
            disabled={userPlan !== 'premium'}
            title={userPlan === 'premium' ? 'PDF Übersicht erstellen' : 'Premium erforderlich'}
          >
            🖨️ PDF Übersicht
          </button>
          <button
            onClick={() => atFreeLimit ? setError('Du hast das Limit von 5 Verbindlichkeiten erreicht. Upgrade auf Premium!') : setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition"
          >
            ＋ Hinzufügen
          </button>
        </div>
      </div>

      {/* Free limit warning */}
      {atFreeLimit && (
        <div className="bg-sf-am/10 border border-sf-am/20 rounded-2xl px-5 py-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-sm font-semibold text-sf-am">Free-Limit erreicht (5/5)</p>
            <p className="text-xs text-sf-tm">Upgrade auf Premium für unbegrenzte Schulden, Vereinbarungen und PDF-Export.</p>
          </div>
        </div>
      )}

      {error && !showAdd && (
        <div className="bg-sf-co/10 border border-sf-co/20 rounded-xl px-4 py-3 text-sm text-sf-co mb-4">{error}</div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition
              ${filter === f.id ? 'bg-sf-em/15 text-sf-em border border-sf-em/30' : 'bg-sf-bg-e text-sf-tm border border-white/5 hover:text-sf-ts'}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {([
          { id: 'all', label: 'Alle Typen', count: catCounts.all },
          { id: 'kredit', label: 'Kredit', count: catCounts.kredit },
          { id: 'ratenkauf', label: 'Ratenkauf', count: catCounts.ratenkauf },
          { id: 'rechnung', label: 'Rechnung', count: catCounts.rechnung },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setCatFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition
              ${catFilter === f.id ? 'bg-sf-em/15 text-sf-em border border-sf-em/30' : 'bg-sf-bg-e text-sf-tm border border-white/5 hover:text-sf-ts'}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Debt List */}
      <div className="space-y-2">
        {filtered.map(d => <DebtCard key={d.id} debt={d} />)}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">✨</p>
            <p className="font-semibold">Keine Einträge</p>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-5" onClick={() => setShowAdd(false)}>
          <div className="bg-sf-bg-c rounded-3xl p-7 w-full max-w-xl max-h-[88vh] overflow-auto border border-white/10 shadow-2xl animate-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Neue Verbindlichkeit</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg border border-white/10 bg-sf-bg-e text-sf-tm flex items-center justify-center">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Emoji picker */}
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-2">Symbol</label>
                <div className="flex gap-1.5 flex-wrap">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setEmoji(e)}
                      className={`w-9 h-9 rounded-lg text-lg border-2 flex items-center justify-center transition
                        ${emoji === e ? 'border-sf-em bg-sf-em/15' : 'border-white/5 bg-sf-bg-e'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separator: Grunddaten */}
              <p className="text-xs font-bold text-sf-ts uppercase tracking-wider pt-2 border-t border-white/5">💰 Grunddaten</p>
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-1">Bezeichnung *</label>
                <input name="name" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="z.B. Stadtwerke" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-sf-ts mb-1">Gesamtbetrag * (€)</label>
                  <input name="original_amount" type="number" step="0.01" min="0.01" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sf-ts mb-1">Rate/Monat * (€)</label>
                  <input name="monthly_rate" type="number" step="0.01" min="0" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" />
                </div>
              </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-sf-ts mb-1">Status</label>
                <select name="plan_status" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition">
                  <option value="open">Offen / plötzlich</option>
                  <option value="negotiation">In Klärung</option>
                  <option value="rate">Rate vereinbart</option>
                </select>
              </div>
            </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-sf-ts mb-1">Fälligkeit</label>
                  <input name="due_date" type="date" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sf-ts mb-1">Notizen</label>
                  <input name="notes" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="Optional..." />
                </div>
              </div>

              {/* Separator: Gläubiger */}
              <p className="text-xs font-bold text-sf-ts uppercase tracking-wider pt-2 border-t border-white/5">🏢 Gläubiger-Kontakt <span className="font-normal text-sf-tf">(optional)</span></p>
              <input name="creditor_name" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="Firmenname / Name" />
              <input name="creditor_address" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="Adresse" />
              <div className="grid grid-cols-2 gap-3">
                <input name="creditor_phone" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="Telefon" />
                <input name="creditor_email" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="E-Mail" />
              </div>

              {/* Separator: Bank */}
              <p className="text-xs font-bold text-sf-ts uppercase tracking-wider pt-2 border-t border-white/5">🏦 Bankverbindung <span className="font-normal text-sf-tf">(optional)</span></p>
              <input name="bank_name" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="Kontoinhaber / Bank" />
              <div className="grid grid-cols-3 gap-3">
                <input name="bank_iban" className="col-span-2 bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="IBAN" />
                <input name="bank_bic" className="bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="BIC" />
              </div>
              <input name="bank_ref" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="Verwendungszweck" />

              {/* Error + Buttons */}
              {error && <div className="bg-sf-co/10 border border-sf-co/20 rounded-xl px-4 py-3 text-sm text-sf-co">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sf-ts bg-transparent border border-white/10 hover:bg-white/5 transition">
                  Abbrechen
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition disabled:opacity-50">
                  {saving ? 'Speichern...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
