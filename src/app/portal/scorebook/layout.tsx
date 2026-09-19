import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase-server';

export default async function ScorebookLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_active || !['coach', 'admin'].includes(profile.role)) {
    redirect('/portal');
  }

  return children;
}
