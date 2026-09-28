'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight, FaBasketball, FaBolt, FaCalendarDays, FaChartSimple,
  FaCircleCheck, FaCrown, FaImage, FaListOl, FaRankingStar,
  FaShieldHalved, FaTrophy, FaUserGroup,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Role = 'player' | 'coach' | 'fan' | 'staff' | 'admin';
type BadgeSnapshot = { name:string; icon:string|null; tier:string|null; earned_at:string };
type TeamSnapshot = { id:string; name:string; slug:string; logo_url:string|null };
type StatsSnapshot = { games:number; ppg:number; rpg:number; apg:number; spg:number; bpg:number };
type FantasySnapshot = { id:string; name:string; total_points:number; wins:number; losses:number };
type DashboardState = {
  stats: StatsSnapshot | null;
  badges: BadgeSnapshot[];
  teams: TeamSnapshot[];
  fantasy: FantasySnapshot[];
  rep: { xp:number; level:number } | null;
};

const EMPTY: DashboardState = { stats:null, badges:[], teams:[], fantasy:[], rep:null };
const avg = (total:number, games:number) => games ? Math.round((total / games) * 10) / 10 : 0;

function roleLabel(role:Role) {
  if (role === 'admin') return 'League Admin';
  if (role === 'staff') return 'League Staff';
  if (role === 'coach') return 'Coach';
  if (role === 'player') return 'Player';
  return 'Fan';
}

function FeatureCard({title,copy,href,icon:Icon,accent='blue',eyebrow='RCL Competition'}:{title:string;copy:string;href:string;icon:typeof FaBasketball;accent?:'blue'|'orange';eyebrow?:string}) {
  const orange=accent==='orange';
  return <Link href={href} className={`group relative min-h-52 overflow-hidden rounded-3xl border p-6 transition hover:-translate-y-1 ${orange?'border-rcl-orange/25 bg-rcl-orange/[.045] hover:border-rcl-orange/55':'border-rcl-blue/20 bg-gradient-to-br from-[#0a1b2a] to-[#050b12] hover:border-rcl-blue/50'}`}>
    <small className={`text-[10px] font-black uppercase tracking-[.2em] ${orange?'text-rcl-orange':'text-rcl-blue'}`}>{eyebrow}</small>
    <span className={`mt-7 grid h-12 w-12 place-items-center rounded-2xl text-xl ${orange?'bg-rcl-orange/10 text-rcl-orange':'bg-rcl-blue/10 text-rcl-blue'}`}><Icon/></span>
    <h3 className="mt-5 font-display text-2xl font-black uppercase">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-white/48">{copy}</p>
    <FaArrowRight className="absolute bottom-6 right-6 text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/>
  </Link>;
}

function StatusTile({label,value,detail,accent=false}:{label:string;value:string;detail:string;accent?:boolean}) {
  return <div className={`rounded-2xl border p-4 ${accent?'border-rcl-orange/25 bg-rcl-orange/[.055]':'border-white/10 bg-black/20'}`}>
    <p className={`text-[10px] font-black uppercase tracking-[.18em] ${accent?'text-rcl-orange':'text-white/32'}`}>{label}</p>
    <p className="mt-2 font-display text-2xl font-black uppercase">{value}</p>
    <p className="mt-1 text-xs leading-5 text-white/35">{detail}</p>
  </div>;
}

export function LeagueCenterExperience() {
  const { user, profile, loading:authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state,setState] = useState<DashboardState>(EMPTY);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const role=(profile?.role ?? 'fan') as Role;
  const operator=['coach','staff','admin'].includes(role);

  useEffect(() => {
    let active=true;
    const client=supabase;
    const activeUser=user;
    if (!client || !activeUser || !profile) { setLoading(false); return; }
    const db=client as any;

    async function load() {
      setLoading(true); setError('');
      try {
        const next:DashboardState={ stats:null, badges:[], teams:[], fantasy:[], rep:null };
        const level=await db.from('user_levels').select('xp,level').eq('profile_id',activeUser.id).maybeSingle();
        if (level.data) next.rep={ xp:Number(level.data.xp??0), level:Number(level.data.level??1) };

        if (role==='player') {
          const playerResult=await db.from('players').select('id').eq('profile_id',activeUser.id).eq('is_active',true).maybeSingle();
          const playerId=playerResult.data?.id as string|undefined;
          if (playerId) {
            const [seasonResult,badgeResult]=await Promise.all([
              db.from('seasons').select('id').eq('status','active').order('start_date',{ascending:false}).limit(1).maybeSingle(),
              db.from('player_badges').select('earned_at,badge:badges(name,icon,tier)').eq('player_id',playerId).order('earned_at',{ascending:false}).limit(4),
            ]);
            next.badges=(badgeResult.data??[]).map((row:any)=>({name:row.badge?.name??'RCL Badge',icon:row.badge?.icon??null,tier:row.badge?.tier??null,earned_at:row.earned_at}));
            const seasonId=seasonResult.data?.id as string|undefined;
            if (seasonId) {
              const games=await db.from('games').select('id').eq('season_id',seasonId).eq('status','completed');
              const gameIds=(games.data??[]).map((game:any)=>game.id);
              if (gameIds.length) {
                const stats=await db.from('player_game_stats').select('game_id,points,rebounds,assists,steals,blocks').eq('player_id',playerId).in('game_id',gameIds);
                const rows=stats.data??[];
                const totals=rows.reduce((sum:any,row:any)=>({points:sum.points+Number(row.points??0),rebounds:sum.rebounds+Number(row.rebounds??0),assists:sum.assists+Number(row.assists??0),steals:sum.steals+Number(row.steals??0),blocks:sum.blocks+Number(row.blocks??0)}),{points:0,rebounds:0,assists:0,steals:0,blocks:0});
                const gamesPlayed=new Set(rows.map((row:any)=>row.game_id)).size;
                next.stats={games:gamesPlayed,ppg:avg(totals.points,gamesPlayed),rpg:avg(totals.rebounds,gamesPlayed),apg:avg(totals.assists,gamesPlayed),spg:avg(totals.steals,gamesPlayed),bpg:avg(totals.blocks,gamesPlayed)};
              } else next.stats={games:0,ppg:0,rpg:0,apg:0,spg:0,bpg:0};
            }
          }
        }

        if (operator) {
          if (role==='admin'||role==='staff') {
            const teams=await db.from('teams').select('id,name,slug,logo_url').eq('is_active',true).order('name').limit(20);
            next.teams=teams.data??[];
          } else {
            const assignments=await db.from('team_coaches').select('team_id').eq('profile_id',activeUser.id);
            const teamIds=[...new Set((assignments.data??[]).map((row:any)=>row.team_id))];
            if (teamIds.length) {
              const teams=await db.from('teams').select('id,name,slug,logo_url').in('id',teamIds).eq('is_active',true).order('name');
              next.teams=teams.data??[];
            }
            const badges=await db.from('coach_badges').select('earned_at,badge:badges(name,icon,tier)').eq('profile_id',activeUser.id).order('earned_at',{ascending:false}).limit(4);
            next.badges=(badges.data??[]).map((row:any)=>({name:row.badge?.name??'Coach Badge',icon:row.badge?.icon??null,tier:row.badge?.tier??null,earned_at:row.earned_at}));
          }
        }

        if (role==='fan') {
          const [badges,fantasy]=await Promise.all([
            db.from('fan_badges').select('earned_at,badge:badges(name,icon,tier)').eq('profile_id',activeUser.id).order('earned_at',{ascending:false}).limit(4),
            db.from('fantasy_teams').select('id,name,total_points,wins,losses').eq('manager_id',activeUser.id).order('created_at',{ascending:false}).limit(4),
          ]);
          next.badges=(badges.data??[]).map((row:any)=>({name:row.badge?.name??'Fan Badge',icon:row.badge?.icon??null,tier:row.badge?.tier??null,earned_at:row.earned_at}));
          next.fantasy=(fantasy.data??[]).map((row:any)=>({id:row.id,name:row.name,total_points:Number(row.total_points??0),wins:Number(row.wins??0),losses:Number(row.losses??0)}));
        }

        if (active) setState(next);
      } catch (cause) {
        console.error('Unable to load League Center member state',cause);
        if (active) setError('Your personalized league status is temporarily unavailable. Core league tools still work.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return()=>{active=false;};
  },[operator,profile,role,supabase,user]);

  const displayName=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'RCL Member';

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <section className="relative overflow-hidden border-b border-rcl-blue/20 bg-[linear-gradient(120deg,#071522_0%,#03070d_58%,#08121d_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,79,22,.18),transparent_28%),radial-gradient(circle_at_12%_72%,rgba(21,159,255,.15),transparent_32%)]"/>
      <Container maxWidth="xl" className="relative py-12 md:py-18">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">{authLoading?'RCL Competition':`${roleLabel(role)} Center`} · Richmond, Virginia</p>
            <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.9] sm:text-6xl md:text-8xl">League<br/><span className="text-rcl-blue">Center.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/58 md:text-lg">Your basketball organization in one place. Competition, team operations, identity, fantasy and live RCL activity adapt to your role.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/schedule" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-sm font-black uppercase text-black">Schedule <FaArrowRight/></Link><Link href="/runs" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/35 bg-rcl-blue/10 px-5 text-sm font-black uppercase">Open Runs <FaBasketball/></Link></div>
          </div>
          {profile&&<div className="min-w-64 rounded-3xl border border-white/10 bg-[#071522]/80 p-5 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Signed in as</p><p className="mt-2 font-display text-2xl font-black uppercase">{displayName}</p><div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/38"><FaCircleCheck className="text-rcl-orange"/>{roleLabel(role)} access</div>{state.rep&&<div className="mt-4 border-t border-white/10 pt-4"><span className="text-xs text-white/35">REP</span><strong className="ml-2 text-rcl-orange">{state.rep.xp.toLocaleString()}</strong><span className="ml-2 text-xs text-white/30">LVL {state.rep.level}</span></div>}</div>}
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-9 sm:py-12">
      {error&&<div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{error}</div>}

      {role==='player'&&<section>
        <p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">My season</p><h2 className="mt-2 font-display text-3xl font-black uppercase md:text-4xl">Play. Track. Climb.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatusTile label="Games logged" value={loading?'—':String(state.stats?.games??0)} detail="Current-season completed games"/><StatusTile label="Scoring" value={loading?'—':`${state.stats?.ppg??0} PPG`} detail={`${state.stats?.rpg??0} RPG · ${state.stats?.apg??0} APG`} accent/><StatusTile label="Defense" value={loading?'—':`${state.stats?.spg??0} SPG`} detail={`${state.stats?.bpg??0} BPG`}/><StatusTile label="Badges" value={loading?'—':String(state.badges.length)} detail={state.badges[0]?.name?`Latest: ${state.badges[0].name}`:'Earned RCL achievements'}/></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><FeatureCard title="Schedule" copy="Know your next matchup and every game on the league calendar." href="/schedule" icon={FaCalendarDays} accent="orange"/><FeatureCard title="Leaderboards" copy="See where your production ranks against the rest of the city." href="/leaderboards" icon={FaListOl}/><FeatureCard title="Player Rankings" copy="Track RCL ranking movement and your competitive position." href="/rankings" icon={FaRankingStar}/><FeatureCard title="Stats + Badges" copy="Open your official numbers, badges and basketball identity." href={user?`/social/profile/${user.id}?tab=stats`:'/stats'} icon={FaTrophy}/></div>
      </section>}

      {operator&&<section>
        <p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Team operations</p><h2 className="mt-2 font-display text-3xl font-black uppercase md:text-4xl">Run your team from RCL.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Official stats flow from the Scorebook into results, player profiles, leaderboards and Fantasy scoring. Coaches operate their team; admins control the league layer.</p>
        {state.teams.length>0&&<div className="mt-5 flex flex-wrap gap-2">{state.teams.slice(0,10).map(team=><Link key={team.id} href={`/teams/${team.slug}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-black uppercase"><FaShieldHalved className="text-rcl-blue"/>{team.name}</Link>)}</div>}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><FeatureCard title="Scorebook" copy="Log the game live and push official team and player stats through the platform." href="/portal/scorebook" icon={FaChartSimple} accent="orange" eyebrow="Live game operations"/><FeatureCard title="Team Site" copy="Post announcements, game-day photos and team news from one publishing workspace." href="/portal/team" icon={FaImage} eyebrow="Team publishing"/><FeatureCard title="Draft Night" copy={role==='admin'?'Configure the draft, clock, order and rules while coaches make protected selections.':'Scout the board and make your official selection when your team is on the clock.'} href={role==='admin'?'/admin/operations':'/draft'} icon={FaCrown} eyebrow="Roster building"/><FeatureCard title="League Operations" copy="Schedules, rosters, standings and official competition controls for authorized staff." href={role==='admin'?'/admin/operations':'/league'} icon={FaShieldHalved} eyebrow="Organization control"/></div>
      </section>}

      {role==='fan'&&<section>
        <p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Fan experience</p><h2 className="mt-2 font-display text-3xl font-black uppercase md:text-4xl">Own a team. Follow the real league.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Rich City Hoops Fantasy uses registered RCL players and official game statistics. Your fantasy experience moves when the real league moves.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><StatusTile label="Fantasy teams" value={loading?'—':String(state.fantasy.length)} detail={state.fantasy[0]?.name??'Join public or create private'} accent/><StatusTile label="Fantasy record" value={state.fantasy[0]?`${state.fantasy[0].wins}-${state.fantasy[0].losses}`:'0-0'} detail="Official matchup results"/><StatusTile label="Badges" value={loading?'—':String(state.badges.length)} detail={state.badges[0]?.name?`Latest: ${state.badges[0].name}`:'Fan achievements and REP'}/></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><FeatureCard title="RCL Fantasy" copy="Draft real RCL players, manage your roster and score from official live stats." href="/fantasy" icon={FaTrophy} accent="orange" eyebrow="Rich City Hoops Fantasy"/><FeatureCard title="League Games" copy="Follow the real results driving your fantasy roster and weekly matchups." href="/games" icon={FaBasketball}/><FeatureCard title="Leaderboards" copy="Follow the league's top performers before making roster decisions." href="/leaderboards" icon={FaRankingStar}/><FeatureCard title="Badges + REP" copy="Build your fan identity through participation across the RCL Network." href="/badges" icon={FaBolt}/></div>
      </section>}

      <section className="mt-10 border-t border-white/10 pt-10"><div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><Link href="/runs" className="group relative overflow-hidden rounded-3xl border border-rcl-orange/25 bg-[radial-gradient(circle_at_85%_15%,rgba(255,79,22,.22),transparent_28%),linear-gradient(135deg,#071522,#03070d)] p-7 sm:p-9"><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">For every RCL member</p><h2 className="mt-3 max-w-2xl font-display text-4xl font-black uppercase sm:text-5xl">Rich City<br/>Open Runs.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/50">Find real basketball, create a run, claim a spot and turn Network connections into games across Richmond.</p><span className="mt-7 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-orange">Open Runs <FaArrowRight className="transition group-hover:translate-x-1"/></span></Link><div className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/70 p-7"><FaUserGroup className="text-3xl text-rcl-blue"/><h3 className="mt-5 font-display text-2xl font-black uppercase">League directory</h3><p className="mt-2 text-sm leading-6 text-white/45">Players, teams, standings and official league data remain available to every member.</p><div className="mt-6 grid grid-cols-2 gap-2 text-xs font-black uppercase"><Link className="rounded-xl border border-white/10 p-3 hover:border-rcl-blue/40" href="/players">Players</Link><Link className="rounded-xl border border-white/10 p-3 hover:border-rcl-blue/40" href="/teams">Teams</Link><Link className="rounded-xl border border-white/10 p-3 hover:border-rcl-blue/40" href="/standings">Standings</Link><Link className="rounded-xl border border-white/10 p-3 hover:border-rcl-blue/40" href="/stats">Stats</Link></div></div></div></section>
    </Container>
  </main>;
}
