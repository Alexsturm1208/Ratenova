import { createServerSupabase } from '@/lib/supabase-server';
import { getDebts, getProfile } from '@/lib/services';
import { redirect } from 'next/navigation';
import AgreementsClient from './AgreementsClient';

export default async function AgreementsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: debts }, { data: profile }] = await Promise.all([
    getDebts(supabase),
    getProfile(supabase, user.id),
  ]);

  return (
    <AgreementsClient
      debts={debts ?? []}
      userPlan={profile?.plan || 'free'}
    />
  );
}
