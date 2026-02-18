'use client';

import { useState } from 'react';
import type { Debt, DebtStatus } from '@/types';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { updateDebt } from '@/lib/services';
import { useRouter } from 'next/navigation';

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';

const statusMap: Record<DebtStatus, { label: string; colorClass: string; bgClass: string }> = {
  ok:      { label: 'Aktuell',      colorClass: 'text-sf-em', bgClass: 'bg-sf-em/15' },
  soon:    { label: 'Bald fällig',  colorClass: 'text-sf-am', bgClass: 'bg-sf-am/10' },
  today:   { label: 'Heute fällig', colorClass: 'text-sf-co', bgClass: 'bg-sf-co/10' },
  overdue: { label: 'Überfällig',   colorClass: 'text-sf-co', bgClass: 'bg-sf-co/10' },
  done:    { label: 'Erledigt',     colorClass: 'text-sf-em', bgClass: 'bg-sf-em/15' },
  pending: { label: 'In Klärung',   colorClass: 'text-sf-tm', bgClass: 'bg-white/10' },
};

export function getDebtStatus(debt: Debt): DebtStatus {
  if (debt.paid_amount >= debt.original_amount) return 'done';
  if (debt.plan_status !== 'rate') return 'pending';
  if (!debt.due_date) return 'ok';
  const days = Math.ceil((new Date(debt.due_date + 'T00:00:00').getTime() - Date.now()) / 864e5);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 5) return 'soon';
  return 'ok';
}

export function getDebtCategory(debt: Debt): 'Kredit' | 'Ratenkauf' | 'Rechnung' {
  const hasBank = !!(debt.bank_iban || debt.bank_bic || debt.bank_name);
  if (hasBank) return 'Kredit';
  // Heuristik: Gläubiger vorhanden, regelmäßige Rate => Ratenkauf
  if ((debt.creditor_name || debt.creditor_address) && debt.monthly_rate > 0) return 'Ratenkauf';
  return 'Rechnung';
}

function Badge({ status }: { status: DebtStatus }) {
  const s = statusMap[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.colorClass} ${s.bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.colorClass === 'text-sf-em' ? 'bg-sf-em' : s.colorClass === 'text-sf-am' ? 'bg-sf-am' : 'bg-sf-co'}`}
        style={{ boxShadow: `0 0 6px currentColor` }}
      />
      {s.label}
    </span>
  );
}

function ProgressBar({ percent, height = 4 }: { percent: number; height?: number }) {
  return (
    <div className="bg-white/5 rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-sf-em-d to-sf-em transition-all duration-700 ease-out"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

export default function DebtCard({ debt }: { debt: Debt }) {
  const status = getDebtStatus(debt);
  const cat = getDebtCategory(debt);
  const remaining = debt.original_amount - debt.paid_amount;
  const percent = debt.original_amount === 0 ? 100 : Math.round((debt.paid_amount / debt.original_amount) * 100);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    e.preventDefault();
    setSaving(true);
    const val = e.target.value as 'open' | 'negotiation' | 'rate';
    const { error } = await updateDebt(supabase as any, debt.id, { plan_status: val });
    setSaving(false);
    if (!error) router.refresh();
  }

  return (
    <Link href={`/debts/${debt.id}`}
      className="block bg-sf-bg-c rounded-2xl p-4 border border-white/5 hover:border-white/10 hover:bg-sf-bg-h hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sf-bg-e to-sf-bg-c border border-white/5 flex items-center justify-center text-xl shrink-0">
          {debt.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-2 mb-1">
            <p className="text-sm font-semibold truncate">{debt.name}</p>
            <Badge status={status} />
          </div>
          <div className="text-[10px] text-sf-tm uppercase tracking-wider mb-1">{cat}</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-sf-tm">{fmt(remaining)} offen</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sf-em">{percent}%</span>
              <div onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); }} className="relative">
                <select
                  value={debt.plan_status}
                  onChange={handleStatusChange}
                  disabled={saving}
                  className="text-xs bg-sf-bg-e border border-white/10 rounded-lg px-2 py-1 text-sf-t hover:border-sf-em/30 focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15"
                  title="Status ändern"
                >
                  <option value="open">Offen</option>
                  <option value="negotiation">In Klärung</option>
                  <option value="rate">Rate vereinbart</option>
                </select>
              </div>
            </div>
          </div>
          <ProgressBar percent={percent} />
        </div>
      </div>
    </Link>
  );
}
