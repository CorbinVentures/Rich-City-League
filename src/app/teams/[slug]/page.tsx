import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTeamDetail, getLeagueSnapshot } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';
import { getTeamTheme } from '@/lib/team-themes';

export const revalidate = 60;

const tabs = [
  ['home','Home'], ['roster','Roster'], ['schedule','Schedule'], ['stats','Stats'], ['news','News'], ['media','Media'], ['history','History'],
] as const;
type TeamTab = typeof tabs[number][0];

export default async function TeamDetailPage({ params, searchParams }: { params: Promise<{ slug:string }>; searchParams: Promise<{ view?:string }> }) {
  const { slug } = await params;
  const { view } = await searchParams;
  const data = await getTeamDetail(slug);
  if (!data) notFound();
  const snapshot = await getLeagueSnapshot();
  const tab: TeamTab = tabs.some(([key])=>key===view) ? view as TeamTab : 'home';
  const { team, league, seasons, divisions, teamSeasons, rosters, players, coaches, games, standings, playerStats, teamStats, venues } = data;
  const seasonById=new Map(seasons.map(s=>[s.id,s]));
  const divisionById=new Map(divisions.map(d=>[d.id,d]));
  const playerById=new Map(players.map(p=>[p.id,p]));
  const currentSeason=seasons.find(s=>s.status==='active') ?? seasons.find(s=>s.status==='registration') ?? seasons[0];
  const currentTeamSeason=teamSeasons.find(ts=>ts.season_id===currentSeason?.id);
  const currentRoster=currentTeamSeason?rosters.filter(r=>r.team_season_id===currentTeamSeason.id):rosters;
  const record=standings.find(s=>s.season_id===currentSeason?.id);
  const division=divisionById.get(currentTeamSeason?.division_id??'');
  const now=Date.now();
  const upcoming=[...games].filter(g=>!['completed','cancelled'].includes(g.status)&&new Date(g.scheduled_at).getTime()>=now).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
  const recent=[...games].filter(g=>g.status==='completed').sort((a,b)=>b.scheduled_at.localeCompare(a.scheduled_at));
  const teamName=(id:string)=>snapshot.teams.find(t=>t.id===id)?.name??'RCL Team';
  const opponent=(game:typeof games[number])=>game.home_team_id===team.id?teamName(game.away_team_id):teamName(game.home_team_id);
  const totals=playerStats.reduce((s,x)=>({pts:s.pts+x.points,reb:s.reb+x.rebounds,ast:s.ast+x.assists,stl:s.stl+x.steals,blk:s.blk+x.blocks}),{pts:0,reb:0,ast:0,stl:0,blk:0});
  const gp=new Set(playerStats.map(x=>x.game_id)).size;
  const avg=(v:number)=>gp?(v/gp).toFixed(1):'—';
  const theme=getTeamTheme(team.slug,team.primary_color,team.secondary_color);
  const accent=theme.accent;
  const secondary=theme.secondary;

  return <main className="min-h-screen pb-24 text-white" style={{backgroundColor:theme.surface,'--team-accent':accent,'--team-secondary':secondary,'--team-glow':theme.glow} as React.CSSProperties}>
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 opacity-95" style={{background:theme.atmosphere}}/>
      <div className="absolute -right-10 top-0 select-none font-display text-[9rem] font-black uppercase leading-none tracking-tighter text-white/[.025] sm:text-[14rem]" aria-hidden="true">{theme.motif}</div>
      <div className="absolute inset-0 opacity-[.07] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:22px_22px]"/>
      <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-12 sm:pt-16">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><p className="text-[10px] font-black uppercase tracking-[.3em]" style={{color:accent}}>Rich City League · Team Network</p><span className="text-[9px] font-black uppercase tracking-[.28em] text-white/35">{theme.tagline}</span></div>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
          {team.logo_url?<Image src={team.logo_url} alt={`${team.name} logo`} width={160} height={160} className="h-32 w-32 rounded-2xl border border-white/10 bg-black/55 object-contain p-2 shadow-2xl sm:h-40 sm:w-40" style={{boxShadow:`0 20px 70px ${theme.glow}22`}}/>:<div className="h-32 w-32 rounded-2xl sm:h-40 sm:w-40" style={{backgroundColor:accent}}/>}
          <div className="flex-1"><h1 className="font-display text-4xl font-black uppercase leading-none sm:text-6xl">{team.name}</h1><p className="mt-3 text-xs font-black uppercase tracking-[.2em] text-white/55">{team.city??'Richmond'}, Virginia · {division?.name??'Rich City League'}</p>{team.description&&<p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{team.description}</p>}</div>
          <div className="flex gap-3"><div className="min-w-24 border border-white/10 bg-black/30 px-5 py-4 text-center"><p className="text-[9px] uppercase tracking-widest text-white/40">Record</p><p className="mt-1 font-display text-3xl font-black">{record?`${record.wins}–${record.losses}`:'0–0'}</p></div></div>
        </div>
      </div>
    </section>

    <nav className="sticky top-0 z-20 border-b border-white/10 backdrop-blur" style={{backgroundColor:`${theme.surface}f2`}} aria-label={`${team.name} navigation`}>
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">{tabs.map(([key,label])=><Link key={key} href={key==='home'?`/teams/${team.slug}`:`/teams/${team.slug}?view=${key}`} className={`whitespace-nowrap border-b-2 px-4 py-4 text-[10px] font-black uppercase tracking-widest ${tab===key?'text-white':'border-transparent text-white/40 hover:text-white'}`} style={tab===key?{borderColor:accent}:undefined}>{label}</Link>)}</div>
    </nav>

    <div className="mx-auto max-w-7xl px-5 py-9" style={{backgroundImage:`linear-gradient(180deg, ${theme.glow}08, transparent 420px)`}}>
      {tab==='home'&&<div className="grid gap-6 lg:grid-cols-[1.5fr_.8fr]">
        <section className="border border-white/10 bg-white/[.025] p-6"><Eyebrow color={accent}>Next game</Eyebrow>{upcoming[0]?<><div className="mt-5 flex items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-white/40">{formatDate(upcoming[0].scheduled_at)} · {formatTime(upcoming[0].scheduled_at)}</p><h2 className="mt-3 font-display text-3xl font-black uppercase">vs {opponent(upcoming[0])}</h2><p className="mt-2 text-sm text-white/45">{venues.find(v=>v.id===upcoming[0].venue_id)?.name??'Venue TBA'}</p></div><Link href={`/games/${upcoming[0].id}`} className="text-xs font-black uppercase tracking-widest" style={{color:accent}}>Game details →</Link></div></>:<Empty text="No upcoming game is scheduled."/>}</section>
        <section className="border border-white/10 bg-white/[.025] p-6"><Eyebrow color={accent}>Team quick info</Eyebrow><dl className="mt-5 space-y-4 text-sm"><Row a="Division" b={division?.name??'Pending'}/><Row a="Season" b={currentSeason?.name??'Pending'}/><Row a="Roster" b={`${currentRoster.length} players`}/><Row a="Coaches" b={coaches.length?String(coaches.length):'Pending'}/></dl></section>
        <section className="border border-white/10 bg-white/[.025] p-6 lg:col-span-2"><Eyebrow color={accent}>Team pulse</Eyebrow><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{[['GP',gp],['PPG',avg(totals.pts)],['RPG',avg(totals.reb)],['APG',avg(totals.ast)],['STL',avg(totals.stl)]].map(([k,v])=><Stat key={String(k)} label={String(k)} value={String(v)}/>)}</div></section>
      </div>}

      {tab==='roster'&&<section><Title color={accent}>Team roster</Title>{!currentRoster.length?<Empty text="The official roster will populate here as players are assigned."/>:<div className="mt-6 overflow-hidden border border-white/10"><div className="hidden grid-cols-[70px_1.4fr_.7fr_.7fr_1fr] bg-white/[.04] px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white/35 sm:grid"><span>#</span><span>Player</span><span>Position</span><span>Height</span><span>Hometown</span></div>{currentRoster.map(r=>{const p=playerById.get(r.player_id);if(!p)return null;const feet=p.height_inches?Math.floor(p.height_inches/12):null;const inches=p.height_inches?p.height_inches%12:null;return <Link href={`/players/${p.id}`} key={r.id} className="grid grid-cols-[55px_1fr] gap-3 border-t border-white/5 px-5 py-4 hover:bg-white/[.03] sm:grid-cols-[70px_1.4fr_.7fr_.7fr_1fr]"><span style={{color:accent}}>{r.jersey_number??p.jersey_number??'—'}</span><span className="font-bold">{p.first_name} {p.last_name}</span><span className="text-white/50">{p.position??'—'}</span><span className="text-white/50">{feet?`${feet}'${inches}"`:'—'}</span><span className="text-white/50">{p.hometown??'—'}</span></Link>})}</div>}</section>}

      {tab==='schedule'&&<section><Title color={accent}>{currentSeason?.name??'Current'} schedule</Title><div className="mt-6 space-y-3">{[...games].sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).map(g=><Link key={g.id} href={`/games/${g.id}`} className="grid gap-3 border border-white/10 bg-white/[.02] p-5 hover:border-white/25 sm:grid-cols-[150px_1fr_150px] sm:items-center"><div><p className="text-xs font-black uppercase" style={{color:accent}}>{g.status}</p><p className="mt-1 text-xs text-white/45">{formatDate(g.scheduled_at)} · {formatTime(g.scheduled_at)}</p></div><p className="font-display text-xl font-black uppercase">{g.home_team_id===team.id?'vs':'@'} {opponent(g)}</p><p className="text-xs uppercase text-white/45 sm:text-right">{venues.find(v=>v.id===g.venue_id)?.name??'TBA'} →</p></Link>)}</div></section>}

      {tab==='stats'&&<section><Title color={accent}>Team stats</Title><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{[['GP',gp],['PPG',avg(totals.pts)],['RPG',avg(totals.reb)],['APG',avg(totals.ast)],['BPG',avg(totals.blk)]].map(([k,v])=><Stat key={String(k)} label={String(k)} value={String(v)}/>)}</div><div className="mt-8 border border-white/10 p-6"><Eyebrow color={accent}>Season totals</Eyebrow><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat label="Points" value={String(totals.pts)}/><Stat label="Rebounds" value={String(totals.reb)}/><Stat label="Assists" value={String(totals.ast)}/><Stat label="Stat lines" value={String(playerStats.length)}/></div></div></section>}

      {tab==='news'&&<section><Title color={accent}>Team news</Title><Empty text={`${team.name} stories, announcements and features will live here as team-specific publishing is added.`}/></section>}
      {tab==='media'&&<section><Title color={accent}>Team media</Title><Empty text={`${team.name} photos, highlights and videos will live here as team media is published.`}/></section>}
      {tab==='history'&&<section><Title color={accent}>Franchise history</Title><p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">This is the permanent Rich City League home for {team.name}. Seasons, records and future accomplishments stay connected to this team identity rather than being replaced when a new season begins.</p><div className="mt-7 space-y-3">{[...seasons].sort((a,b)=>b.start_date.localeCompare(a.start_date)).map(s=>{const ts=teamSeasons.find(x=>x.season_id===s.id);const standing=standings.find(x=>x.season_id===s.id);return <div key={s.id} className="grid gap-3 border border-white/10 p-5 sm:grid-cols-[1fr_1fr_120px]"><div><p className="font-display text-xl font-black uppercase">{s.name}</p><p className="text-xs text-white/40">{s.start_date} — {s.end_date}</p></div><p className="text-sm text-white/50">{divisionById.get(ts?.division_id??'')?.name??'Division history pending'}</p><p className="font-display text-xl font-black sm:text-right">{standing?`${standing.wins}–${standing.losses}`:'—'}</p></div>})}</div></section>}

      <section className="mt-14 border-t border-white/10 pt-8"><p className="text-[9px] font-black uppercase tracking-[.28em] text-white/35">Nine teams · one city</p><div className="mt-4 flex gap-3 overflow-x-auto pb-3">{snapshot.teams.map(t=><Link key={t.id} href={`/teams/${t.slug}`} className={`min-w-[150px] border p-4 text-center ${t.id===team.id?'border-white/40 bg-white/[.05]':'border-white/10'}`}>{t.logo_url?<img src={t.logo_url} alt="" className="mx-auto h-16 w-16 object-contain"/>:<div className="mx-auto h-16 w-16 rounded-xl" style={{backgroundColor:t.primary_color??'#ff6b1a'}}/>}<p className="mt-3 text-[10px] font-black uppercase">{t.name}</p></Link>)}</div></section>
    </div>
  </main>;
}
function Eyebrow({children,color}:{children:React.ReactNode;color:string}){return <p className="text-[10px] font-black uppercase tracking-[.28em]" style={{color}}>{children}</p>}
function Title({children,color}:{children:React.ReactNode;color:string}){return <div><Eyebrow color={color}>Team network</Eyebrow><h2 className="mt-2 font-display text-4xl font-black uppercase">{children}</h2></div>}
function Stat({label,value}:{label:string;value:string}){return <div className="border border-white/10 bg-white/[.025] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 font-display text-3xl font-black">{value}</p></div>}
function Row({a,b}:{a:string;b:string}){return <div className="flex justify-between gap-4 border-b border-white/5 pb-3"><dt className="text-white/35">{a}</dt><dd className="text-right font-bold">{b}</dd></div>}
function Empty({text}:{text:string}){return <div className="mt-6 border border-dashed border-white/15 p-10 text-center text-sm text-white/40">{text}</div>}
