import { createServerSupabase } from '@/lib/supabase-server';
import { getDebts, getPayments, computeTotals } from '@/lib/services';
import { redirect } from 'next/navigation';
import TimelineClient from './TimelineClient';

export default async function TimelinePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: debts }, { data: payments }] = await Promise.all([
    getDebts(supabase),
    getPayments(supabase),
  ]);

  const totals = computeTotals(debts ?? []);

  return <TimelineClient debts={debts ?? []} payments={payments ?? []} totals={totals} />;
}
