import { redirect } from 'next/navigation';
import { ScorebookAppLink } from '@/components/ScorebookAppLink';
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
          <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">RCL GAME IQ™</p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase">Staff access required</h1>
          <p className="mt-3 text-sm text-white/45">The live scorebook and coaching intelligence are available to authorized RCL coaches and administrators.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D9E4EF] bg-white p-4 text-[#0F2547]">
        <div>
          <p className="text-xs font-black text-[#2563EB]">RCH SCOREBOOK · STANDALONE APP</p>
          <p className="mt-1 text-xs text-[#64748B]">Launch the dedicated Scorebook app. The original scoring screen remains below as a backup.</p>
        </div>
        <ScorebookAppLink className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#3B82F6] px-4 py-3 text-center text-sm font-bold text-white">
          Open standalone Scorebook ↗
        </ScorebookAppLink>
      </div>
      {children}
    </>
  );
}
