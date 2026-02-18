import { createServerSupabase } from '@/lib/supabase-server';
import { getDebt, getPayments } from '@/lib/services';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DebtDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const debtId = params.id;
  const [{ data: debt }, { data: payments }] = await Promise.all([
    getDebt(supabase, debtId),
    getPayments(supabase, debtId),
  ]);

  if (!debt) {
    redirect('/debts');
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';

  const remaining = debt.original_amount - debt.paid_amount;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/debts" className="text-sm text-sf-tm hover:text-sf-ts mb-6 block">← Zurück</Link>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{debt.emoji}</span>
          <div>
            <h1 className="text-xl font-extrabold">{debt.name}</h1>
            <p className="text-sm text-sf-tm">Details und Zahlungen</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide font-semibold mb-1">Gesamt</p>
            <p className="text-xl font-bold">{fmt(debt.original_amount)}</p>
          </div>
          <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide font-semibold mb-1">Bezahlt</p>
            <p className="text-xl font-bold text-sf-em">{fmt(debt.paid_amount)}</p>
          </div>
          <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide font-semibold mb-1">Restverbindlichkeit</p>
            <p className="text-xl font-bold text-sf-co">{fmt(remaining)}</p>
          </div>
          <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] text-sf-tm uppercase tracking-wide font-semibold mb-1">Rate/Monat</p>
            <p className="text-xl font-bold">{fmt(debt.monthly_rate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-sf-bg-c rounded-2xl border border-white/5 p-5">
            <h3 className="text-[15px] font-bold mb-3">Gläubiger</h3>
            <p className="text-sm">{debt.creditor_name || '–'}</p>
            <p className="text-sm text-sf-tm">{debt.creditor_address || '–'}</p>
            <div className="text-xs text-sf-tm mt-2">
              <p>{debt.creditor_email || ''}</p>
              <p>{debt.creditor_phone || ''}</p>
            </div>
          </div>
          <div className="bg-sf-bg-c rounded-2xl border border-white/5 p-5">
            <h3 className="text-[15px] font-bold mb-3">Bank</h3>
            <p className="text-sm">{debt.bank_name || '–'}</p>
            <p className="text-sm text-sf-tm">{debt.bank_iban || '–'}</p>
            <p className="text-sm text-sf-tm">{debt.bank_bic || '–'}</p>
            <p className="text-xs text-sf-tm mt-2">{debt.bank_ref || ''}</p>
          </div>
        </div>

        <div className="mb-3 flex justify-between items-center">
          <h3 className="text-[15px] font-bold">Zahlungen</h3>
        </div>
        <div className="space-y-2">
          {payments && payments.length > 0 ? payments.map(p => (
            <div key={p.id} className="bg-sf-bg-c rounded-2xl p-4 border border-white/5 flex justify-between">
              <div>
                <p className="text-sm font-semibold">{fmt(p.amount)}</p>
                <p className="text-xs text-sf-tm">{p.note || '–'}</p>
              </div>
              <div className="text-sm text-sf-tm">{new Date(p.date).toLocaleDateString('de-DE')}</div>
            </div>
          )) : (
            <div className="bg-sf-bg-c rounded-2xl p-8 text-center border border-white/5 text-sf-tm">Keine Zahlungen erfasst.</div>
          )}
        </div>
      </div>
    </div>
  );
}
