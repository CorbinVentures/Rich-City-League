'use client';

import Link from 'next/link';
import { AdminWorkspace } from '@/components/AdminWorkspace';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Division, Game, League, Season, Team, TeamSeason } from '@/types/database';

type Counts = { leagues:number; seasons:number; divisions:number; teams:number; teamSeasons:number; players:number; rosters:number; games:number };
const emptyCounts: Counts = { leagues:0, seasons:0, divisions:0, teams:0, teamSeasons:0, players:0, rosters:0, games:0 };

export default function LeagueSetupPage() {
  const { profile, loading: authLoading } = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const [leagues,setLeagues]=useState<League[]>([]);
  const [seasons,setSeasons]=useState<Season[]>([]);
  const [divisions,setDivisions]=useState<Division[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [teamSeasons,setTeamSeasons]=useState<TeamSeason[]>([]);
  const [counts,setCounts]=useState<Counts>(emptyCounts);
  const [busy,setBusy]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [leagueAppsSyncing,setLeagueAppsSyncing]=useState(false);

  const [league,setLeague]=useState({name:'Rich City League',slug:'rich-city-league',description:''});
  const [season,setSeason]=useState({leagueId:'',name:'',slug:'',startDate:'',endDate:'',status:'draft' as Season['status']});
  const [division,setDivision]=useState({seasonId:'',name:'',ageGroup:'Adult',gender:'Open',maxTeams:''});
  const [team,setTeam]=useState({leagueId:'',name:'',slug:'',shortName:''});
  const [teamSeason,setTeamSeason]=useState({teamId:'',seasonId:'',divisionId:''});
  const [game,setGame]=useState({seasonId:'',divisionId:'',homeTeamId:'',awayTeamId:'',scheduledAt:'',status:'scheduled' as Game['status']});

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';

  async function load() {
    if (!client) return;
    setBusy(true);
    const [l,s,d,t,ts,g,p,r] = await Promise.all([
      client.from('leagues').select('*').order('name'),
      client.from('seasons').select('*').order('start_date',{ascending:false}),
      client.from('divisions').select('*').order('name'),
      client.from('teams').select('*').order('name'),
      client.from('team_seasons').select('*'),
      client.from('games').select('*').order('scheduled_at',{ascending:false}),
      client.from('players').select('*',{count:'exact',head:true}),
      client.from('rosters').select('*',{count:'exact',head:true}),
    ]);
    const firstError=[l.error,s.error,d.error,t.error,ts.error,g.error,p.error,r.error].find(Boolean);
    if (firstError) setError(firstError.message);
    else {
      const ls=(l.data??[]) as League[], ss=(s.data??[]) as Season[], ds=(d.data??[]) as Division[], ts1=(t.data??[]) as Team[], tss=(ts.data??[]) as TeamSeason[];
      setLeagues(ls); setSeasons(ss); setDivisions(ds); setTeams(ts1); setTeamSeasons(tss);
      setCounts({leagues:ls.length,seasons:ss.length,divisions:ds.length,teams:ts1.length,teamSeasons:tss.length,players:p.count??0,rosters:r.count??0,games:(g.data??[]).length});
      setSeason(x=>({...x,leagueId:x.leagueId||ls[0]?.id||''}));
      setTeam(x=>({...x,leagueId:x.leagueId||ls[0]?.id||''}));
      setDivision(x=>({...x,seasonId:x.seasonId||ss[0]?.id||''}));
      setTeamSeason(x=>({...x,seasonId:x.seasonId||ss[0]?.id||'',teamId:x.teamId||ts1[0]?.id||''}));
      setGame(x=>({...x,seasonId:x.seasonId||ss[0]?.id||'',divisionId:x.divisionId||ds[0]?.id||''}));
    }
    setBusy(false);
  }

  useEffect(()=>{ if(!authLoading && isStaff) void load(); },[authLoading,isStaff]);

  async function submit(action:()=>PromiseLike<{error:{message:string}|null}>|{error:{message:string}|null}) {
    if (!client) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const result=await action();
      if(result.error) setError(result.error.message);
      else { setMessage('Saved successfully.'); await load(); }
    } finally { setSaving(false); }
  }

  async function syncLeagueAppsStructure() {
    setLeagueAppsSyncing(true); setError(null); setMessage(null);
    try {
      const { data: sessionData } = await client!.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Your admin session is unavailable. Please sign in again.');
      const headers = { Authorization: `Bearer ${token}` };

      const registrationResponse = await fetch('/api/admin/leagueapps?action=sync&resource=registrations-2', { cache:'no-store', headers });
      const registrationData = await registrationResponse.json();
      if (!registrationResponse.ok) throw new Error(registrationData.error || 'LeagueApps registration sync failed.');

      const structureResponse = await fetch('/api/admin/leagueapps?action=materialize-structure', { cache:'no-store', headers });
      const structureData = await structureResponse.json();
      if (!structureResponse.ok) throw new Error(structureData.error || 'LeagueApps structure sync failed.');

      const result = structureData.result ?? {};
      setMessage(`LeagueApps synced: ${result.seasons ?? 0} season(s), ${result.teams ?? 0} team(s), ${result.teamSeasons ?? 0} team assignment(s) reconciled.`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'LeagueApps structure sync failed.');
    } finally {
      setLeagueAppsSyncing(false);
    }
  }

  const field='mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-rcl-orange/60';
  const label='block text-[9px] font-black uppercase tracking-[.18em] text-white/45';
  const button='rounded-xl bg-rcl-orange px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-40';

  if(authLoading||busy) return <main><AdminWorkspace /><Container maxWidth="xl" className="py-16"><div className="h-8 w-64 animate-pulse rounded bg-white/10"/><div className="mt-8 h-96 animate-pulse rounded-3xl bg-white/5"/></Container></main>;
  if(!profile||!isStaff) return <main><AdminWorkspace /><Container maxWidth="xl" className="py-16"><h1 className="font-display text-3xl font-black uppercase">League setup access required</h1><p className="mt-3 text-gray-400">This workspace is limited to league staff and administrators.</p></Container></main>;

  if (!client) return <main><AdminWorkspace /><Container maxWidth="xl" className="py-16"><p className="text-red-300">Supabase is not configured.</p></Container></main>;

  const seasonDivisions=divisions.filter(d=>d.season_id===division.seasonId);
  const gameDivisions=divisions.filter(d=>d.season_id===game.seasonId);
  const seasonTeams=teamSeasons.filter(ts=>ts.season_id===game.seasonId).map(ts=>teams.find(t=>t.id===ts.team_id)).filter((t):t is Team=>Boolean(t));

  return <main className="min-h-screen bg-[#05080d] pb-20 text-white"><AdminWorkspace /><Container maxWidth="xl" className="py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-rcl-orange">RCL DATA FOUNDATION</p><h1 className="mt-2 font-display text-4xl font-black uppercase">League setup</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Build the real competition hierarchy in order: league → season → division → teams → team seasons → games. This does not seed demo production records.</p></div><Link href="/portal/scorebook" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black uppercase tracking-widest">Open Scorebook</Link></div>
    <section className="mt-8 rounded-3xl border border-rcl-orange/25 bg-rcl-orange/[.04] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">LEAGUEAPPS SOURCE</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Sync league structure</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">Pull the latest LeagueApps registration structure into RCL and reconcile seasons, teams, divisions and team-season assignments. Existing LeagueApps-linked records update instead of duplicating.</p></div>
        <button type="button" onClick={() => void syncLeagueAppsStructure()} disabled={leagueAppsSyncing} className={button}>{leagueAppsSyncing?'Syncing LeagueApps…':'Sync from LeagueApps'}</button>
      </div>
    </section>
    {(message||error)&&<div className={`mt-6 rounded-2xl border p-4 text-sm \${error?'border-red-400/20 bg-red-400/10 text-red-200':'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'}`}>{error??message}</div>}
    <section className="mt-8 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">{Object.entries(counts).map(([label,value])=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-white/35">{label.replace(/([A-Z])/g,' $1')}</p><p className="mt-2 font-display text-2xl font-black">{value}</p></div>)}</section>

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form onSubmit={e=>{e.preventDefault();void submit(()=>client!.from('leagues').insert({name:league.name.trim(),slug:league.slug.trim().toLowerCase(),description:league.description.trim()||null} as never));}} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">01 · LEAGUE</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Create league</h2><div className="mt-5 space-y-3"><input className={field} value={league.name} onChange={e=>setLeague({...league,name:e.target.value})} placeholder="League name"/><input className={field} value={league.slug} onChange={e=>setLeague({...league,slug:e.target.value.replace(/\\s+/g,'-')})} placeholder="Slug"/><textarea className={field} value={league.description} onChange={e=>setLeague({...league,description:e.target.value})} placeholder="Description" rows={3}/><button className={button} disabled={saving}>Create league</button></div></form>

      <form onSubmit={e=>{e.preventDefault();void submit(()=>client!.from('seasons').insert({league_id:season.leagueId,name:season.name.trim(),slug:season.slug.trim().toLowerCase(),start_date:season.startDate,end_date:season.endDate,status:season.status} as never));}} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">02 · SEASON</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Create season</h2><div className="mt-5 space-y-3"><select className={field} value={season.leagueId} onChange={e=>setSeason({...season,leagueId:e.target.value})}><option value="">Select league</option>{leagues.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input className={field} value={season.name} onChange={e=>setSeason({...season,name:e.target.value})} placeholder="2026 Fall League"/><input className={field} value={season.slug} onChange={e=>setSeason({...season,slug:e.target.value.replace(/\\s+/g,'-')})} placeholder="2026-fall"/><div className="grid grid-cols-2 gap-3"><label className={label}>Start date<input aria-label="Season start date" type="date" className={field} value={season.startDate} onChange={e=>setSeason({...season,startDate:e.target.value})}/></label><label className={label}>End date<input aria-label="Season end date" type="date" className={field} value={season.endDate} onChange={e=>setSeason({...season,endDate:e.target.value})}/></label></div><label className={label}>Season status<select aria-label="Season status" className={field} value={season.status} onChange={e=>setSeason({...season,status:e.target.value as Season['status']})}>{(['draft','registration','active','completed','archived'] as const).map(x=><option key={x}>{x}</option>)}</select></label><button className={button} disabled={saving||!season.leagueId}>Create season</button></div></form>

      <form onSubmit={e=>{e.preventDefault();void submit(()=>client!.from('divisions').insert({season_id:division.seasonId,name:division.name.trim(),age_group:division.ageGroup.trim()||null,gender:division.gender.trim()||null,max_teams:division.maxTeams?Number(division.maxTeams):null} as never));}} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">03 · DIVISION</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Create division</h2><div className="mt-5 space-y-3"><label className={label}>Season<select aria-label="Division season" className={field} value={division.seasonId} onChange={e=>setDivision({...division,seasonId:e.target.value})}><option value="">Select season</option>{seasons.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><input className={field} value={division.name} onChange={e=>setDivision({...division,name:e.target.value})} placeholder="Open Division"/><div className="grid grid-cols-2 gap-3"><input className={field} value={division.ageGroup} onChange={e=>setDivision({...division,ageGroup:e.target.value})} placeholder="Adult"/><input className={field} value={division.gender} onChange={e=>setDivision({...division,gender:e.target.value})} placeholder="Open"/></div><input type="number" min="1" className={field} value={division.maxTeams} onChange={e=>setDivision({...division,maxTeams:e.target.value})} placeholder="Max teams (optional)"/><button className={button} disabled={saving||!division.seasonId}>Create division</button></div></form>

      <form onSubmit={e=>{e.preventDefault();void submit(()=>client!.from('teams').insert({league_id:team.leagueId,name:team.name.trim(),slug:team.slug.trim().toLowerCase(),short_name:team.shortName.trim()||null} as never));}} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">04 · TEAM</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Create team</h2><div className="mt-5 space-y-3"><select className={field} value={team.leagueId} onChange={e=>setTeam({...team,leagueId:e.target.value})}><option value="">Select league</option>{leagues.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input className={field} value={team.name} onChange={e=>setTeam({...team,name:e.target.value})} placeholder="Team name"/><input className={field} value={team.slug} onChange={e=>setTeam({...team,slug:e.target.value.replace(/\\s+/g,'-')})} placeholder="team-slug"/><input className={field} value={team.shortName} onChange={e=>setTeam({...team,shortName:e.target.value})} placeholder="Short name"/><button className={button} disabled={saving||!team.leagueId}>Create team</button></div></form>

      <form onSubmit={e=>{e.preventDefault();void submit(()=>client!.from('team_seasons').insert({team_id:teamSeason.teamId,season_id:teamSeason.seasonId,division_id:teamSeason.divisionId||null} as never));}} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">05 · TEAM SEASON</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Assign team to season</h2><div className="mt-5 space-y-3"><label className={label}>Season<select aria-label="Team season" className={field} value={teamSeason.seasonId} onChange={e=>setTeamSeason({...teamSeason,seasonId:e.target.value,divisionId:''})}><option value="">Select season</option>{seasons.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className={label}>Team<select aria-label="Team to assign" className={field} value={teamSeason.teamId} onChange={e=>setTeamSeason({...teamSeason,teamId:e.target.value})}><option value="">Select team</option>{teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className={label}>Division (optional)<select aria-label="Team division" className={field} value={teamSeason.divisionId} onChange={e=>setTeamSeason({...teamSeason,divisionId:e.target.value})}><option value="">Division (optional)</option>{divisions.filter(x=>x.season_id===teamSeason.seasonId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><button className={button} disabled={saving||!teamSeason.seasonId||!teamSeason.teamId}>Assign team</button></div></form>

      <form onSubmit={e=>{e.preventDefault();if(game.homeTeamId===game.awayTeamId)return;void submit(()=>client!.from('games').insert({season_id:game.seasonId,division_id:game.divisionId||null,home_team_id:game.homeTeamId,away_team_id:game.awayTeamId,scheduled_at:new Date(game.scheduledAt).toISOString(),status:game.status,created_by:profile.id} as never));}} className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.03] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">06 · GAME</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Create scheduled game</h2><div className="mt-5 space-y-3"><label className={label}>Season<select aria-label="Game season" className={field} value={game.seasonId} onChange={e=>setGame({...game,seasonId:e.target.value,divisionId:'',homeTeamId:'',awayTeamId:''})}><option value="">Select season</option>{seasons.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className={label}>Division (optional)<select aria-label="Game division" className={field} value={game.divisionId} onChange={e=>setGame({...game,divisionId:e.target.value})}><option value="">Division (optional)</option>{gameDivisions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className={label}>Home team<select aria-label="Home team" className={field} value={game.homeTeamId} onChange={e=>setGame({...game,homeTeamId:e.target.value})}><option value="">Home team</option>{seasonTeams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className={label}>Away team<select aria-label="Away team" className={field} value={game.awayTeamId} onChange={e=>setGame({...game,awayTeamId:e.target.value})}><option value="">Away team</option>{seasonTeams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><label className={label}>Game date & time<input aria-label="Game date and time" type="datetime-local" className={field} value={game.scheduledAt} onChange={e=>setGame({...game,scheduledAt:e.target.value})}/></label><button className={button} disabled={saving||!game.seasonId||!game.homeTeamId||!game.awayTeamId||!game.scheduledAt||game.homeTeamId===game.awayTeamId}>Create game</button><p className="text-xs leading-5 text-white/35">Create only from real league scheduling data. Demo records remain local seed data.</p></div></form>
    </div>

    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-white/35">READINESS</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Scorebook dependency chain</h2></div><Link href="/portal/operations" className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest">Open operations</Link></div><div className="mt-5 grid gap-3 md:grid-cols-6">{[['League',counts.leagues>0],['Season',counts.seasons>0],['Division',counts.divisions>0],['Team season',counts.teamSeasons>1],['Players + rosters',counts.players>0&&counts.rosters>0],['Games',counts.games>0]].map(([label,ready])=><div key={label as string} className={`rounded-2xl border p-4 \${ready?'border-emerald-400/20 bg-emerald-400/[.04]':'border-white/10 bg-black/20'}`}><p className="text-[9px] font-black uppercase tracking-widest text-white/35">{label as string}</p><p className="mt-2 text-xs font-black uppercase">{ready?'READY':'MISSING'}</p></div>)}</div></section>
  </Container></main>;
}
