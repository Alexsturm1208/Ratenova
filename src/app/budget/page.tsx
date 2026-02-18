 import { createServerSupabase } from '@/lib/supabase-server';
 import { getDebts, computeTotals, getProfile, getRecurringExpenses, getRecurringIncomes } from '@/lib/services';
 import { redirect } from 'next/navigation';
 import BudgetClient from './BudgetClient';
 
 export default async function BudgetPage() {
   const supabase = await createServerSupabase();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) redirect('/auth/login');
 
  const [{ data: debts }, { data: profile }, { data: expenses }, { data: incomes }] = await Promise.all([
     getDebts(supabase),
     getProfile(supabase, user.id),
     getRecurringExpenses(supabase),
    getRecurringIncomes(supabase),
   ]);
 
   const totals = computeTotals(debts ?? []);
 
   return (
     <BudgetClient
       expenses={expenses ?? []}
       incomes={incomes ?? []}
       totals={totals}
       profile={profile!}
       userId={user.id}
     />
   );
 }
