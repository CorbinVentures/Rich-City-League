'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { RCL_PILOT_OPERATIONS, inspectRclPilotReadiness, type RclOperationsSnapshot } from '@/lib/rcl-operations-readiness';

const emptySnapshot: RclOperationsSnapshot = {
  season:null,assignedClubs:[],activeRosters:[],scheduledGames:[],eligibleDraftProspects:0,draft:null,draftPreflightBlockers:null,
};

type SeasonRecord = {id:string;name:string;start_date:string;status:string};
type TeamSeasonRecord = {id:string;team_id:string;season_id:string};

export default function RclLeagueReadinessPage() {
  const { profile, loading: authLoading } = useAuth();
  const db = useMemo(() => getSupabaseClient(), []);
  const [snapshot,setSnapshot]=useState<RclOperationsSnapshot>(emptySnapshot);
  const [seasonName,setSeasonName]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const authorized=profile?.role==='admin'||profile?.role==='staff';

  useEffect(()=>{
    if(authLoading) return;
    if(!db || !authorized) {setLoading(false);return;}
    let cancelled=false;
    async function load() {
      setLoading(true);setError('');
      try {
        const league=await db!.from('leagues').select('id,slug').eq('slug','rich-city-league').maybeSingle();
        if(league.error) throw league.error;
        if(!league.data) throw new Error('The official Rich City League record is unavailable.');
        const season=await db!.from('seasons').select('id,name,start_date,status')
          .eq('league_id',league.data.id).gte('start_date','2027-11-01')
          .order('start_date',{ascending:true}).limit(1).maybeSingle();
        if(season.error)throw season.error;
        if(!season.data){ if(!cancelled) {setSnapshot(emptySnapshot);setSeasonName('');}return; }
        const official=season.data as SeasonRecord;
        const [assignments,games,draft,pool]=await Promise.all([
          db!.from('team_seasons').select('id,team_id,season_id').eq('season_id',official.id),
          db!.from('games').select('home_team_id,away_team_id').eq('season_id',official.id),
          db!.from('drafts').select('id,status,rounds,roster_limit').eq('season_id',official.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
          db!.from('draft_pools').select('player_id').eq('season_id',official.id).eq('eligible',true),
        ]);
        const problem=[assignments.error,games.error,draft.error,pool.error].find(Boolean);
        if(problem)throw problem;
        const links=(assignments.data??[]) as TeamSeasonRecord[];
        const ids=links.map(item=>item.team_id);
        const seasonIds=links.map(item=>item.id);
        const [teams,rosters]=await Promise.all([
          ids.length ? db!.from('teams').select('id,is_active').in('id',ids) : Promise.resolve({data:[],error:null}),
          seasonIds.length ? db!.from('rosters').select('player_id,team_season_id,left_at').in('team_season_id',seasonIds).is('left_at',null) : Promise.resolve({data:[],error:null}),
        ]);
        if(teams.error||rosters.error)throw teams.error??rosters.error;
        const rpc=draft.data ? await db!.rpc('season_draft_readiness',{target_draft:draft.data.id}) : null;
        if(rpc?.error)throw rpc.error;
        const draftPreflightBlockers=rpc && Array.isArray(rpc.data) ? rpc.data.map(String) : null;
        const active=new Map((teams.data??[]).map(t=>[t.id,t.is_active]));
        if(cancelled)return;
        setSeasonName(official.name);
        setSnapshot({
          season:{id:official.id,start_date:official.start_date,status:official.status},
          assignedClubs:links.map(item=>({team_id:item.team_id,team_season_id:item.id,active:active.get(item.team_id)===true})),
          activeRosters:(rosters.data??[]).map(r=>({player_id:r.player_id,team_season_id:r.team_season_id})),
          scheduledGames:(games.data??[]).map(g=>({home_team_id:g.home_team_id,away_team_id:g.away_team_id})),
          eligibleDraftProspects:(pool.data??[]).length,
          draft:draft.data ? {status:draft.data.status,rounds:draft.data.rounds,roster_limit:draft.data.roster_limit}:null,
          draftPreflightBlockers,
        });
      } catch(e) {
        if(!cancelled)setError(e instanceof Error?e.message:'Unable to inspect official league records.');
      } finally {if(!cancelled)setLoading(false);}
    }
    void load();
    return ()=>{cancelled=true;};
  },[db,authLoading,authorized]);

  if(authLoading||loading) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><p>Checking official league records…</p></Container></main>;
  if(!authorized) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="text-2xl font-bold">League staff access required</h1></Container></main>;

  const readiness=inspectRclPilotReadiness(snapshot);
  const passed=readiness.checks.filter(check=>check.passed).length;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white"><Container maxWidth="lg" className="py-10 sm:py-14">
    <Link href="/admin/operations" className="text-sm font-bold text-rcl-orange">← League Operations</Link>
    <p className="mt-8 text-xs font-bold uppercase tracking-widest text-rcl-orange">INTERNAL PRELAUNCH REVIEW · PROPOSED MODEL</p>
    <h1 className="mt-2 font-display text-4xl font-black uppercase">Inaugural season readiness</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">Planning baseline: {RCL_PILOT_OPERATIONS.clubs} clubs, {RCL_PILOT_OPERATIONS.regularSeasonGamesPerClub} games per club, {RCL_PILOT_OPERATIONS.regularSeasonGamesTotal} total regular-season games, {RCL_PILOT_OPERATIONS.playoffClubs} playoff clubs. These are recommendations, not signed league policy.</p>
    <div role="status" className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5">
      <b className="text-amber-100">NOT APPROVED FOR OPENING NIGHT</b>
      <p className="mt-2 text-sm leading-6 text-white/65">Technical preflight: {passed}/{readiness.checks.length} checks. {readiness.clearTechnicalPreflight ? 'Automated checks satisfied; manual approvals remain outstanding.' : 'There are unresolved technical blockers.'} {seasonName? `Season reviewed: ${seasonName}.`:'No qualifying November 2027 professional-season record exists.'} Even six green checks do not replace executed contracts, financial verification, insurance, commissioner approval or a published rulebook.</p>
    </div>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/25 p-4 text-sm text-red-200">{error}</p>}
    <section className="mt-8 space-y-3" aria-label="Operational technical preflight">
      {readiness.checks.map(check=><article key={check.id} className="flex gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
        <span className={check.passed?'mt-1 text-emerald-300':'mt-1 text-amber-300'} aria-hidden="true">{check.passed?'✓':'○'}</span>
        <div><h2 className="text-sm font-bold">{check.label}</h2><p className="mt-1 text-xs leading-5 text-white/55">{check.detail}</p></div>
      </article>)}
    </section>
    <section className="mt-9 rounded-2xl border border-white/10 bg-white/[.025] p-6">
      <h2 className="font-display text-2xl font-bold">Manual approvals still required</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">The following items cannot be inferred from database counts. They remain pending until documented, reviewed and approved by responsible personnel.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/70">
        {readiness.requiredManualApprovals.map(item=><li key={item}>{item}</li>)}
      </ol>
    </section>
    <nav aria-label="League operations resources" className="mt-7 flex flex-wrap gap-3">
      <Link href="/admin/league-setup" className="rounded-xl bg-rcl-orange px-5 py-3 text-sm font-bold text-black">League Setup</Link>
      <Link href="/admin/draft" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold">Draft preflight</Link>
      <Link href="/league/rules" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold">Rules preview</Link>
    </nav>
  </Container></main>;
}
