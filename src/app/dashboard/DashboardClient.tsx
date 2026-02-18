'use client';

import type { Debt, Payment, DashboardTotals, RecurringIncome, RecurringExpense } from '@/types';
import Link from 'next/link';
import ProgressRing from '@/components/ProgressRing';
import DebtCard from '@/components/DebtCard';

const motivations = [
  'Du bist auf dem richtigen Weg.',
  'Jede Rate zählt – bleib dran.',
  'Schritt für Schritt zur Freiheit.',
  'Du hast mehr geschafft als du denkst.',
  'Kontrolle fühlt sich gut an.',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';

function daysUntil(d: string | null) {
  if (!d) return 999;
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 864e5);
}

interface Props {
  debts: Debt[];
  payments: Payment[];
  totals: DashboardTotals;
  incomes: RecurringIncome[];
  expenses: RecurringExpense[];
  userName: string;
  userPlan: string;
}

export default function DashboardClient({ debts, totals, incomes, expenses, userName }: Props) {
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const enc = motivations[Math.floor(Date.now() / 864e5) % motivations.length];
  const T = totals;
  const monthlyIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyRates = T.monthlyTotal;
  const net = monthlyIncome - monthlyExpenses - monthlyRates;
  const maxVal = Math.max(monthlyIncome, monthlyExpenses, monthlyRates, Math.abs(net), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-3">
        <div>
          <p className="text-[13px] text-sf-tm tracking-wide">{today}</p>
          <h1 className="text-[32px] font-extrabold leading-tight">Guten Tag, {userName}</h1>
          <p className="text-sm text-sf-tm">{enc}</p>
        </div>
      </div>

      {/* Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sf-bg-c to-sf-em/[0.06] rounded-3xl p-7 border border-sf-em/30 mb-5">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gradient-radial from-sf-em/15 to-transparent" />
        <div className="flex gap-6 items-center flex-wrap relative">
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs text-sf-tm uppercase tracking-[1.5px] font-semibold mb-1.5">Restverbindlichkeit gesamt</p>
            <p className="text-5xl font-extrabold tracking-tight leading-none mb-0.5">{fmt(T.remaining)}</p>
            <p className="text-[13px] text-sf-tm mb-5">von {fmt(T.originalTotal)} ursprünglich</p>
            <div className="flex gap-7 flex-wrap">
              <div>
                <p className="text-[11px] text-sf-tm uppercase tracking-wide">Bezahlt</p>
                <p className="text-[17px] font-bold text-sf-em mt-0.5">{fmt(T.paidTotal)}</p>
              </div>
              <div>
                <p className="text-[11px] text-sf-tm uppercase tracking-wide">Monat</p>
                <p className="text-[17px] font-bold mt-0.5">{fmt(T.monthlyTotal)}</p>
              </div>
              <div>
                <p className="text-[11px] text-sf-tm uppercase tracking-wide">Aktiv</p>
                <p className="text-[17px] font-bold text-sf-am mt-0.5">{T.activeCount} / {T.debtCount}</p>
              </div>
            </div>
          </div>
          <div className="relative shrink-0">
            <ProgressRing percent={T.percentPaid} size={150} strokeWidth={9} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-extrabold text-sf-em">{T.percentPaid}%</p>
              <p className="text-[11px] text-sf-tm">geschafft</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        {T.nextDue && (
          <Link href={`/debts/${T.nextDue.id}`}
            className="bg-sf-bg-c rounded-2xl p-4 border border-white/5 hover:border-white/10 hover:bg-sf-bg-h transition-all"
            style={{ borderLeft: `3px solid ${daysUntil(T.nextDue.due_date) <= 2 ? 'var(--co, #F97066)' : 'var(--am, #FBBF24)'}` }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-sf-am/10 flex items-center justify-center text-xl">{T.nextDue.emoji}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {daysUntil(T.nextDue.due_date) === 0 ? 'Heute fällig' :
                   daysUntil(T.nextDue.due_date) < 0 ? 'Überfällig' :
                   `In ${daysUntil(T.nextDue.due_date)} Tagen fällig`}
                </p>
                <p className="text-[13px] text-sf-tm">{T.nextDue.name} · {fmt(T.nextDue.monthly_rate)}</p>
              </div>
              <span className="text-sf-tm text-xl">›</span>
            </div>
          </Link>
        )}
        <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sf-em/15 flex items-center justify-center text-xl">🎯</div>
            <div>
              <p className="text-sm font-semibold text-sf-em">
                Freiheit in ~{T.monthlyTotal > 0 ? Math.ceil(T.remaining / T.monthlyTotal) : '∞'} Monaten
              </p>
              <p className="text-[13px] text-sf-tm">Weiter so!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income & Expense Stats */}
      <div className="bg-sf-bg-c rounded-3xl p-6 border border-white/5 mb-6">
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="text-[15px] font-bold">Einnahmen & Ausgaben</h3>
          <Link href="/budget" className="text-[13px] font-semibold text-sf-em hover:underline">Zum Budget →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-4">
          <div className="bg-sf-bg-e rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide">Einnahmen/Monat</p>
            <p className="text-xl font-bold text-sf-em">{fmt(monthlyIncome)}</p>
            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-sf-em rounded-full" style={{ width: `${(monthlyIncome / maxVal) * 100}%` }} />
            </div>
          </div>
          <div className="bg-sf-bg-e rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide">Ausgaben/Monat</p>
            <p className="text-xl font-bold text-sf-co">{fmt(monthlyExpenses)}</p>
            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-sf-co rounded-full" style={{ width: `${(monthlyExpenses / maxVal) * 100}%` }} />
            </div>
          </div>
          <div className="bg-sf-bg-e rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide">Raten/Monat</p>
            <p className="text-xl font-bold text-sf-am">{fmt(monthlyRates)}</p>
            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-sf-am rounded-full" style={{ width: `${(monthlyRates / maxVal) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-white/5" style={{ background: net >= 0 ? 'var(--em, #22C55E)10' : 'var(--co, #F97066)10' }}>
            <p className="text-[11px] text-sf-tm uppercase tracking-wide">Ergebnis</p>
            <p className={`text-xl font-bold ${net >= 0 ? 'text-sf-em' : 'text-sf-co'}`}>{net >= 0 ? `Überschuss ${fmt(net)}` : `Defizit ${fmt(Math.abs(net))}`}</p>
            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${net >= 0 ? 'bg-sf-em' : 'bg-sf-co'}`} style={{ width: `${(Math.abs(net) / maxVal) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Debts list preview */}
      <div className="flex justify-between items-center mb-3.5">
        <h3 className="text-[15px] font-bold">Verbindlichkeiten</h3>
        <Link href="/debts" className="text-[13px] font-semibold text-sf-em hover:underline">Alle →</Link>
      </div>
      <div className="space-y-2">
        {debts.slice(0, 4).map(d => (
          <DebtCard key={d.id} debt={d} />
        ))}
        {debts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🕊️</p>
            <p className="font-semibold">Noch keine Verbindlichkeiten erfasst.</p>
            <p className="text-sm text-sf-tm mt-1">
              <Link href="/debts" className="text-sf-em hover:underline">Erste Verbindlichkeit anlegen →</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
