'use client';

import Link from 'next/link';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { FaCheckCircle,FaPeopleGroup } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Team={id:string;name:string};
type Crew={id:string;name:string;captain_id:string};
type LinkRow={crew_id:string;run_team_id:string};
export function RunCrewTeamLinker({runId}:{runId:string}){
  const {user}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [crew,setCrew]=useState<Crew|null>(null);
  const [teams,setTeams]=useState<Team[]>([]);
  const [links,setLinks]=useState<LinkRow[]>([]);
  const [team,setTeam]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [reload,setReload]=useState(0);
  const load=useCallback(async()=>{
    if(!db||!user)return;
    const [entriesResult,teamsResult,linksResult]=await Promise.all([
      db.from('commonwealth_run_entries').select('crew_id').eq('run_id',runId),
      db.from('run_teams').select('id,name').eq('run_id',runId),
      db.from('rch_run_crew_teams').select('crew_id,run_team_id').eq('run_id',runId)
    ]);
    const ids=((entriesResult.data||[]) as {crew_id:string}[]).map(x=>x.crew_id);
    if(ids.length){
      const {data}=await db.from('commonwealth_crews').select('id,name,captain_id')
        .in('id',ids).eq('captain_id',user.id).limit(1);
      setCrew(((data||[]) as Crew[])[0]||null);
    }else setCrew(null);
    setTeams((teamsResult.data||[]) as Team[]);
    setLinks((linksResult.data||[]) as LinkRow[]);
  },[db,runId,user?.id,user]);
  useEffect(()=>{void load();},[load,reload]);
  if(!user||!crew)return null;
  const assigned=links.find(l=>l.crew_id===crew.id);
  const freeTeams=teams.filter(t=>!links.some(link=>link.run_team_id===t.id));
  async function attach(){
    if(!db||!crew||!team)return;
    setBusy(true);setMessage('');
    const {error}=await db.rpc('rch_assign_run_team_to_crew',{p_run_team:team,p_crew:crew.id});
    setMessage(error?error.message:'Crew verified for this Run team. Opponent-confirmed games can now feed the crew circuit.');
    setBusy(false);
    if(!error)setReload(v=>v+1);
  }
  return <section className="mt-5 rounded-3xl border border-[#417bb1] bg-[#0b2740] p-5 text-white sm:p-6" aria-label="Assign crew to Run team">
    <h3 className="flex items-center gap-2 text-lg font-black uppercase"><FaPeopleGroup className="text-[#8ec9ff]"/> Crew match identity</h3>
    <p className="mt-2 text-sm text-[#bed7ea]">Captain of {crew.name}: connect your assembled Run team before submitting its first competitive result. The crew must be registered, and every player on the selected team must be on your crew roster.</p>
    {assigned?<p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-900/20 p-3 text-xs font-bold text-emerald-200"><FaCheckCircle/> Linked to {teams.find(t=>t.id===assigned.run_team_id)?.name||'your Run team'}. Verified match results will count for crew standings during qualifying.</p>:
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <select className="min-h-11 min-w-48 flex-1 rounded-xl border border-[#476b88] bg-[#071728] px-3 text-sm text-white" aria-label="Choose your crew Run team" value={team} onChange={e=>setTeam(e.target.value)}>
        <option value="">Choose an assembled team</option>{freeTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button type="button" disabled={!team||busy} onClick={()=>void attach()} className="min-h-11 rounded-xl bg-[#68bcff] px-4 text-xs font-black text-[#051b2c] disabled:opacity-50">{busy?'Linking…':'Confirm crew team'}</button>
    </div>}
    {!teams.length&&<p className="mt-3 text-xs text-[#b4cade]">Ask the run host to create and assign teams in the Run Room first.</p>}
    {message&&<p role="status" className="mt-3 text-xs text-[#ffdfa4]">{message}</p>}
    <Link href="/crews" className="mt-3 inline-block text-xs font-black text-[#8ccaff] underline">Crew HQ and roster</Link>
  </section>;
}
