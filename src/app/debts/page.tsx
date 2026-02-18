import { createServerSupabase } from '@/lib/supabase-server';
import { getDebts, getProfile } from '@/lib/services';
import { redirect } from 'next/navigation';
import DebtsClient from './DebtsClient';

export default async function DebtsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: debts }, { data: profile }] = await Promise.all([
    getDebts(supabase),
    getProfile(supabase, user.id),
  ]);

  return (
    <DebtsClient
      debts={debts ?? []}
      userPlan={profile?.plan || 'free'}
      userId={user.id}
    />
  );
}
