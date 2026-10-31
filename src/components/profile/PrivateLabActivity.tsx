'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaDumbbell } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Session = { id:string; title:string; skill:string; completed_at:string|null };
/** A private Lab snapshot on the player's own profile, never on another member's public card. */
export function PrivateLabActivity({ profileId }: { profileId: string }) {
  const { user, loading: authLoading } = useAuth();
  const ownProfile = !authLoading && user?.id===profileId;
  const db = useMemo(()=>getSupabaseClient(true) as any,[]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [loading,setLoading]=useState(true);
  const [available,setAvailable]=useState(true);

  useEffect(()=>{
    if (!ownProfile) { setSessions([]);setLoading(false);return; }
    if(!db){setAvailable(false);setLoading(false);return;}
    let live=true;
    void (async()=>{
      const {data,error}=await db.from('lab_sessions')
        .select('id,title,skill,completed_at')
        .eq('profile_id',profileId).eq('status','completed')
        .order('completed_at',{ascending:false}).limit(4);
      if(!live)return;
      if(error) setAvailable(false);
      else {setAvailable(true);setSessions(data||[]);}
      setLoading(false);
    })().catch(()=>{if(live){setAvailable(false);setLoading(false);}});
    return()=>{live=false;};
  },[db,ownProfile,profileId]);

  if(!ownProfile || !available) return null;
  return <section aria-label="Private Lab activity" className="mt-5 rounded-xl border border-[#44484e] bg-[#141618] p-4 text-[#f5f5f3] sm:p-5">
    <div className="flex items-center gap-2">
      <FaDumbbell className="text-[#ff768c]" aria-hidden="true"/>
      <h2 className="font-display text-lg font-black uppercase">The Lab</h2>
      <span className="ml-auto rounded-md border border-[#70747a] px-2 py-1 text-xs text-[#d0d1d4]">Only you</span>
    </div>
    <p className="mt-2 text-xs text-[#d0d1d4]">Training is separate from official game stats. Your session details stay private.</p>
    {loading?<p role="status" className="mt-3 text-sm text-[#a6a8ad]">Loading training progress…</p>
      :sessions.length ? <div className="mt-3 space-y-2">
        {sessions.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#44484e] bg-[#202326] p-3">
          <div className="min-w-0"><strong className="block truncate text-sm">{s.title}</strong><span className="text-xs text-[#d0d1d4]">{s.skill} · Self-reported completion</span></div>
          <span className="text-xs text-[#a6a8ad]">{s.completed_at ? new Date(s.completed_at).toLocaleDateString() : 'Completed'}</span>
        </div>)}
      </div> : <p className="mt-3 text-sm text-[#d0d1d4]">No completed Lab sessions yet.</p>}
  </section>;
}
