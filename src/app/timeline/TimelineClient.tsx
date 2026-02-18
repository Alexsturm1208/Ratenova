'use client';

import type { Debt, Payment, DashboardTotals } from '@/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';

const fmtDate = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }); }
  catch { return d; }
};

interface Props { debts: Debt[]; payments: Payment[]; totals: DashboardTotals; }

export default function TimelineClient({ debts, payments, totals: T }: Props) {
  const sorted = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const debtMap = Object.fromEntries(debts.map(d => [d.id, d]));

  // Monthly aggregation
  const monthlyMap: Record<string, number> = {};
  payments.forEach(p => {
    const key = p.date.slice(0, 7); // YYYY-MM
    monthlyMap[key] = (monthlyMap[key] || 0) + p.amount;
  });
  const months = Object.entries(monthlyMap).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1.5">Verlauf</h1>
      <p className="text-sm text-sf-tm mb-6">Zahlungshistorie und Statistiken</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Gesamt bezahlt', value: fmt(T.paidTotal), color: 'text-sf-em' },
          { label: 'Zahlungen', value: String(payments.length), color: 'text-white' },
          { label: 'Ø pro Zahlung', value: payments.length > 0 ? fmt(T.paidTotal / payments.length) : '–', color: 'text-sf-sk' },
          { label: 'Restschuld', value: fmt(T.remaining), color: 'text-sf-co' },
        ].map(s => (
          <div key={s.label} className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide font-semibold mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Summary */}
      {months.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[15px] font-bold mb-3">Monatliche Übersicht</h3>
          <div className="flex gap-2 flex-wrap">
            {months.slice(0, 6).map(([month, total]) => (
              <div key={month} className="bg-sf-bg-c rounded-xl px-4 py-3 border border-white/5 min-w-[120px]">
                <p className="text-xs text-sf-tm">{month}</p>
                <p className="text-sm font-bold text-sf-em">{fmt(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment List */}
      <h3 className="text-[15px] font-bold mb-3">Alle Zahlungen</h3>
      <div className="space-y-2">
        {sorted.map(p => {
          const debt = debtMap[p.debt_id];
          return (
            <div key={p.id} className="bg-sf-bg-c rounded-2xl p-4 border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sf-em/15 border border-sf-em/30 flex items-center justify-center text-sf-em text-xs font-bold shrink-0">✓</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold truncate">
                    {debt ? `${debt.emoji} ${debt.name}` : 'Unbekannt'}
                  </p>
                  <p className="text-sm font-bold text-sf-em ml-3">{fmt(p.amount)}</p>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-xs text-sf-tm">{fmtDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📝</p>
            <p className="font-semibold">Noch keine Zahlungen erfasst.</p>
            <p className="text-sm text-sf-tm mt-1">Zahlungen werden automatisch hier angezeigt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
