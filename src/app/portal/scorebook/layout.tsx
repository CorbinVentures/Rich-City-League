import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase-server';

export default async function ScorebookLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) redirect('/auth/sign-in');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  const { data: allowed, error } = await supabase.rpc('has_game_iq_access' as never);
  if (error || allowed !== true) {
    return (
      <main className="min-h-screen bg-[#05080d] px-6 py-20 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-rcl-orange">RCL GAME IQ™</p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase">Staff access required</h1>
          <p className="mt-3 text-sm text-white/45">The live scorebook and coaching intelligence are available to authorized RCL coaches and administrators.</p>
        </div>
      </main>
    );
  }

  return children;
}
