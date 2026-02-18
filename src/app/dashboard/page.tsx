import { createServerSupabase } from '@/lib/supabase-server';
import { getDebts, getPayments, computeTotals, getProfile, getRecurringIncomes, getRecurringExpenses } from '@/lib/services';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [
    { data: debts },
    { data: payments },
    { data: profile },
    { data: incomes },
    { data: expenses },
  ] = await Promise.all([
    getDebts(supabase),
    getPayments(supabase),
    getProfile(supabase, user.id),
    getRecurringIncomes(supabase),
    getRecurringExpenses(supabase),
  ]);

  const totals = computeTotals(debts ?? []);

  return (
    <DashboardClient
      debts={debts ?? []}
      payments={payments ?? []}
      totals={totals}
      incomes={incomes ?? []}
      expenses={expenses ?? []}
      userName={profile?.name || user.email?.split('@')[0] || 'Nutzer'}
      userPlan={profile?.plan || 'free'}
    />
  );
}
