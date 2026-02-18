 import { createServerSupabase } from '@/lib/supabase-server';
 import { getProfile } from '@/lib/services';
 import { redirect } from 'next/navigation';
 import AppShell from '@/components/AppShell';
 
 export default async function Layout({ children }: { children: React.ReactNode }) {
   const supabase = await createServerSupabase();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) redirect('/auth/login');
   const { data: profile } = await getProfile(supabase, user.id);
   return (
     <AppShell userName={profile?.name || user.email?.split('@')[0] || 'Nutzer'} userPlan={profile?.plan || 'free'}>
       {children}
     </AppShell>
   );
 }
