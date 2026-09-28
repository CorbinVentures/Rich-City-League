'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaClock, FaListOl, FaShieldHalved, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';

type PublishedDraft = {
  id: string;
  name: string;
  rounds: number;
  roster_limit: number;
  status: string;
  clock_duration_seconds: number;
  rules_text: string | null;
};

export function DraftConfiguredRules() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [draft, setDraft] = useState<PublishedDraft | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      const result = await db
        .from('drafts')
        .select('id,name,rounds,roster_limit,status,clock_duration_seconds,rules_text')
        .in('status', ['OPEN', 'PAUSED', 'COMPLETED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active && !result.error) setDraft((result.data ?? null) as PublishedDraft | null);
    }
    void load();
    return () => { active = false; };
  }, [db, supabase]);

  if (!draft) return null;

  return <section id="official-draft-rules" className="border-t border-white/10 bg-[#03070d] pb-24 pt-10 text-white">
    <Container maxWidth="xl">
      <div className="rounded-3xl border border-rcl-orange/20 bg-[radial-gradient(circle_at_90%_5%,rgba(255,79,22,.13),transparent_28%),#071522] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Official Draft Night rules</p><h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">{draft.name}</h2><p className="mt-2 text-xs font-black uppercase tracking-wider text-white/28">{draft.status} · League-controlled configuration</p></div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[430px]"><Metric icon={<FaListOl/>} label="Rounds" value={String(draft.rounds)}/><Metric icon={<FaClock/>} label="Pick clock" value={`${draft.clock_duration_seconds}s`}/><Metric icon={<FaUsers/>} label="Roster max" value={String(draft.roster_limit)}/></div>
        </div>
        <div className="mt-7 border-t border-white/10 pt-7">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-rcl-blue"><FaShieldHalved/> Commissioner rules</div>
          {draft.rules_text?.trim() ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/58">{draft.rules_text}</p> : <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">Eligible players must be in the official RCL draft pool. Coaches may select only while their assigned team is on the clock. Roster capacity, pick order and player eligibility are enforced by the RCL draft system.</p>}
        </div>
      </div>
    </Container>
  </section>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-rcl-blue">{icon}</div><p className="mt-2 text-[9px] font-black uppercase tracking-wider text-white/25">{label}</p><p className="mt-1 font-display text-lg font-black uppercase">{value}</p></div>;
}
