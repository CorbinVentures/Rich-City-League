import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTeamDetail, getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';
import { getTeamTheme } from '@/lib/team-themes';

export const revalidate = 60;
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const data=await getTeamDetail(slug);if(!data)return{title:'RCL Team',robots:{index:false,follow:false}};const t=data.team;const description=`${t.name} official Rich City League team page: roster, schedule, results, stats and news from Richmond, Virginia basketball.`;return{title:{absolute:`${t.name} | Richmond Basketball Team | RCL`},description,alternates:{canonical:`/teams/${slug}`},openGraph:{url:`/teams/${slug}`,title:`${t.name} | Rich City League`,description,images:t.logo_url?[{url:t.logo_url,alt:`${t.name} logo`}]:[{url:'https://richcityhoops.com/rcl-share-20261002.png',width:1200,height:630,alt:'RCL — Richmond basketball social'}]},robots:{index:false,follow:false}};}

const tabs = [
  ['home','Home'], ['roster','Roster'], ['schedule','Schedule'], ['stats','Stats'], ['news','News'], ['media','Media'], ['history','History'],
] as const;
type TeamTab = typeof tabs[number][0];
type TeamAnnouncement = { id:string; title:string; body:string; is_pinned:boolean; published_at:string };
type TeamNews = { id:string; title:string; slug:string; excerpt:string|null; cover_image_url:string|null; published_at:string|null };
type TeamMedia = { id:string; title:string; description:string|null; storage_path:string; media_type:string; created_at:string; public_url:string };

export default async function TeamDetailPage({ params, searchParams }: { params: Promise<{ slug:string }>; searchParams: Promise<{ view?:string }> }) {
  const { slug } = await params;
  const { view } = await searchParams;
  const data = await getTeamDetail(slug);
  if (!data) notFound();
  const snapshot = await getLeagueSnapshot();
  const tab: TeamTab = tabs.some(([key])=>key===view) ? view as TeamTab : 'home';
  const { team, league, seasons, divisions, teamSeasons, rosters, players, coaches, games, standings, playerStats, teamStats, venues } = data;
  const contentClient = getPublicClient() as any;
  const [announcementResult, newsResult, mediaResult] = contentClient ? await Promise.all([
    contentClient.from('team_announcements').select('id,title,body,is_pinned,published_at').eq('team_id', team.id).order('is_pinned', { ascending:false }).order('published_at', { ascending:false }).limit(20),
    contentClient.from('news').select('id,title,slug,excerpt,cover_image_url,published_at').eq('team_id', team.id).eq('status', 'published').order('published_at', { ascending:false }).limit(20),
    contentClient.from('media').select('id,title,description,storage_path,media_type,created_at').eq('team_id', team.id).eq('status', 'published').order('created_at', { ascending:false }).limit(30),
  ]) : [{ data:[] }, { data:[] }, { data:[] }];
  const announcements = (announcementResult.data ?? []) as TeamAnnouncement[];
  const teamNews = (newsResult.data ?? []) as TeamNews[];
  const teamMedia = ((mediaResult.data ?? []) as Omit<TeamMedia,'public_url'>[]).map(item => ({ ...item, public_url: contentClient?.storage.from('media').getPublicUrl(item.storage_path).data.publicUrl ?? '' })) as TeamMedia[];
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
      {team.logo_url&&<div className="pointer-events-none absolute -right-12 -top-20 h-[460px] w-[460px] opacity-[.13] blur-[1px] sm:-right-16 sm:h-[650px] sm:w-[650px]" aria-hidden="true"><Image src={team.logo_url} alt="" fill sizes="650px" className="object-contain drop-shadow-[0_0_80px_var(--team-glow)]"/></div>}
      <div className="absolute inset-x-0 bottom-0 h-px" style={{background:`linear-gradient(90deg,transparent,${accent},transparent)`}}/>
      <div className="absolute -left-8 bottom-[-2.5rem] select-none font-display text-[5rem] font-black uppercase leading-none tracking-[-.08em] text-white/[.025] sm:text-[8rem]" aria-hidden="true">RICHMOND</div>
      <div className="absolute -right-10 top-0 select-none font-display text-[9rem] font-black uppercase leading-none tracking-tighter text-white/[.025] sm:text-[14rem]" aria-hidden="true">{theme.motif}</div>
      <div className="absolute inset-0 opacity-[.07] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:22px_22px]"/>
      <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-12 sm:pt-16">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><p className="text-xs font-black uppercase tracking-[.3em]" style={{color:accent}}>Rich City League · Team Network</p><span className="text-xs font-black uppercase tracking-[.28em] text-white/35">{theme.tagline}</span></div>
        <div className="mt-8 flex min-h-[250px] flex-col justify-end gap-6 sm:flex-row sm:items-end">
          {team.logo_url?<Image src={team.logo_url} alt={`${team.name} logo`} width={160} height={160} className="h-32 w-32 rounded-2xl border border-white/10 bg-black/55 object-contain p-2 shadow-2xl sm:h-40 sm:w-40" style={{boxShadow:`0 20px 70px ${theme.glow}22`}}/>:<div className="h-32 w-32 rounded-2xl sm:h-40 sm:w-40" style={{backgroundColor:accent}}/>}
          <div className="flex-1"><div className="mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor:accent,boxShadow:`0 0 16px ${theme.glow}`}}/><span className="text-xs font-black uppercase tracking-[.25em] text-white/40">Official franchise site</span></div><h1 className="font-display text-4xl font-black uppercase leading-none drop-shadow-2xl sm:text-6xl">{team.name}</h1><p className="mt-3 text-xs font-black uppercase tracking-[.2em] text-white/55">{team.city??'Richmond'}, Virginia · {division?.name??'Rich City League'}</p>{team.description&&<p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{team.description}</p>}</div>
          <div className="flex gap-3"><div className="min-w-28 border border-white/10 bg-black/45 px-5 py-4 text-center backdrop-blur-md" style={{boxShadow:`inset 0 1px 0 ${accent}44`}}><p className="text-xs uppercase tracking-widest text-white/40">Record</p><p className="mt-1 font-display text-3xl font-black">{record?`${record.wins}–${record.losses}`:'0–0'}</p></div></div>
        </div>
      </div>
    </section>

    <nav className="sticky top-0 z-20 border-b border-white/10 backdrop-blur" style={{backgroundColor:`${theme.surface}f2`}} aria-label={`${team.name} navigation`}>
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">{tabs.map(([key,label])=><Link key={key} href={key==='home'?`/teams/${team.slug}`:`/teams/${team.slug}?view=${key}`} className={`whitespace-nowrap border-b-2 px-4 py-4 text-xs font-black uppercase tracking-widest ${tab===key?'text-white':'border-transparent text-white/40 hover:text-white'}`} style={tab===key?{borderColor:accent}:undefined}>{label}</Link>)}</div>
    </nav>

    <div className="mx-auto max-w-7xl px-5 py-9" style={{backgroundImage:`linear-gradient(180deg, ${theme.glow}08, transparent 420px)`}}>
      {tab==='home'&&<div className="grid gap-6 lg:grid-cols-[1.5fr_.8fr]">
        <section className="border border-white/10 bg-white/[.025] p-6"><Eyebrow color={accent}>Next game</Eyebrow>{upcoming[0]?<><div className="mt-5 flex items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-white/40">{formatDate(upcoming[0].scheduled_at)} · {formatTime(upcoming[0].scheduled_at)}</p><h2 className="mt-3 font-display text-3xl font-black uppercase">vs {opponent(upcoming[0])}</h2><p className="mt-2 text-sm text-white/45">{venues.find(v=>v.id===upcoming[0].venue_id)?.name??'Venue TBA'}</p></div><Link href={`/games/${upcoming[0].id}`} className="text-xs font-black uppercase tracking-widest" style={{color:accent}}>Game details →</Link></div></>:<Empty text="No upcoming game is scheduled."/>}</section>
        <section className="border border-white/10 bg-white/[.025] p-6"><Eyebrow color={accent}>Team quick info</Eyebrow><dl className="mt-5 space-y-4 text-sm"><Row a="Division" b={division?.name??'Pending'}/><Row a="Season" b={currentSeason?.name??'Pending'}/><Row a="Roster" b={`${currentRoster.length} players`}/><Row a="Coaches" b={coaches.length?String(coaches.length):'Pending'}/></dl></section>
        {announcements.length>0&&<section className="border border-white/10 bg-white/[.025] p-6 lg:col-span-2"><div className="flex items-center justify-between gap-4"><Eyebrow color={accent}>Team announcements</Eyebrow><Link href={`/teams/${team.slug}?view=news`} className="text-xs font-black uppercase" style={{color:accent}}>View all →</Link></div><div className="mt-5 grid gap-3 md:grid-cols-2">{announcements.slice(0,2).map(item=><article key={item.id} className="border border-white/10 bg-black/20 p-5"><div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.2em]" style={{color:accent}}>{item.is_pinned?'Pinned update':'Team update'}</span><time className="text-[10px] uppercase text-white/25">{new Date(item.published_at).toLocaleDateString()}</time></div><h2 className="mt-3 font-display text-2xl font-black uppercase">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-white/50">{item.body}</p></article>)}</div></section>}
        <section className="border border-white/10 bg-white/[.025] p-6 lg:col-span-2"><Eyebrow color={accent}>Team pulse</Eyebrow><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{[['GP',gp],['PPG',avg(totals.pts)],['RPG',avg(totals.reb)],['APG',avg(totals.ast)],['STL',avg(totals.stl)]].map(([k,v])=><Stat key={String(k)} label={String(k)} value={String(v)}/>)}</div></section>
      </div>}

      {tab==='roster'&&<section><Title color={accent}>Team roster</Title>{!currentRoster.length?<Empty text="The official roster will populate here as players are assigned."/>:<div className="mt-6 overflow-hidden border border-white/10"><div className="hidden grid-cols-[70px_1.4fr_.7fr_.7fr_1fr] bg-white/[.04] px-5 py-3 text-xs font-black uppercase tracking-widest text-white/35 sm:grid"><span>#</span><span>Player</span><span>Position</span><span>Height</span><span>Hometown</span></div>{currentRoster.map(r=>{const p=playerById.get(r.player_id);if(!p)return null;const feet=p.height_inches?Math.floor(p.height_inches/12):null;const inches=p.height_inches?p.height_inches%12:null;return <Link href={`/players/${p.id}`} key={r.id} className="grid grid-cols-[55px_1fr] gap-3 border-t border-white/5 px-5 py-4 hover:bg-white/[.03] sm:grid-cols-[70px_1.4fr_.7fr_.7fr_1fr]"><span style={{color:accent}}>{r.jersey_number??p.jersey_number??'—'}</span><span className="font-bold">{p.first_name} {p.last_name}</span><span className="text-white/50">{p.position??'—'}</span><span className="text-white/50">{feet?`${feet}'${inches}"`:'—'}</span><span className="text-white/50">{p.hometown??'—'}</span></Link>})}</div>}</section>}

      {tab==='schedule'&&<section><Title color={accent}>{currentSeason?.name??'Current'} schedule</Title><div className="mt-6 space-y-3">{[...games].sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).map(g=><Link key={g.id} href={`/games/${g.id}`} className="grid gap-3 border border-white/10 bg-white/[.02] p-5 hover:border-white/25 sm:grid-cols-[150px_1fr_150px] sm:items-center"><div><p className="text-xs font-black uppercase" style={{color:accent}}>{g.status}</p><p className="mt-1 text-xs text-white/45">{formatDate(g.scheduled_at)} · {formatTime(g.scheduled_at)}</p></div><p className="font-display text-xl font-black uppercase">{g.home_team_id===team.id?'vs':'@'} {opponent(g)}</p><p className="text-xs uppercase text-white/45 sm:text-right">{venues.find(v=>v.id===g.venue_id)?.name??'TBA'} →</p></Link>)}</div></section>}

      {tab==='stats'&&<section><Title color={accent}>Team stats</Title><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{[['GP',gp],['PPG',avg(totals.pts)],['RPG',avg(totals.reb)],['APG',avg(totals.ast)],['BPG',avg(totals.blk)]].map(([k,v])=><Stat key={String(k)} label={String(k)} value={String(v)}/>)}</div><div className="mt-8 border border-white/10 p-6"><Eyebrow color={accent}>Season totals</Eyebrow><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat label="Points" value={String(totals.pts)}/><Stat label="Rebounds" value={String(totals.reb)}/><Stat label="Assists" value={String(totals.ast)}/><Stat label="Stat lines" value={String(playerStats.length)}/></div></div></section>}

      {tab==='news'&&<section><Title color={accent}>Team news</Title>{!announcements.length&&!teamNews.length?<Empty text={`${team.name} has not published an announcement or team story yet.`}/>:<div className="mt-7 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div><Eyebrow color={accent}>Announcements</Eyebrow><div className="mt-4 space-y-3">{announcements.length?announcements.map(item=><article key={item.id} className="border border-white/10 bg-white/[.025] p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.18em]" style={{color:accent}}>{item.is_pinned?'Pinned':'Update'}</span><time className="text-[10px] uppercase text-white/25">{new Date(item.published_at).toLocaleDateString()}</time></div><h3 className="mt-3 font-display text-xl font-black uppercase">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/50">{item.body}</p></article>):<Empty text="No team announcements yet."/>}</div></div><div><Eyebrow color={accent}>Stories</Eyebrow><div className="mt-4 grid gap-4 sm:grid-cols-2">{teamNews.length?teamNews.map(item=><Link href={`/news/${item.slug}`} key={item.id} className="group overflow-hidden border border-white/10 bg-white/[.025] hover:border-white/25">{item.cover_image_url&&<div className="aspect-[16/9] overflow-hidden bg-black/30"><Image src={item.cover_image_url} alt="" width={800} height={450} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"/></div>}<div className="p-5"><time className="text-[10px] font-black uppercase tracking-wider text-white/25">{item.published_at?new Date(item.published_at).toLocaleDateString():'Team story'}</time><h3 className="mt-2 font-display text-xl font-black uppercase group-hover:text-[var(--team-accent)]">{item.title}</h3>{item.excerpt&&<p className="mt-2 line-clamp-3 text-sm leading-6 text-white/45">{item.excerpt}</p>}<span className="mt-4 inline-block text-xs font-black uppercase" style={{color:accent}}>Read story →</span></div></Link>):<Empty text="No team stories yet."/>}</div></div></div>}</section>}
      {tab==='media'&&<section><Title color={accent}>Team media</Title>{!teamMedia.length?<Empty text={`${team.name} has not published game-day media yet.`}/>:<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{teamMedia.map(item=><article key={item.id} className="overflow-hidden border border-white/10 bg-white/[.025]">{item.media_type==='video'?<video controls preload="metadata" className="aspect-video w-full bg-black object-cover" src={item.public_url}/>:<div className="aspect-[4/3] overflow-hidden bg-black/30"><Image src={item.public_url} alt={item.title} width={900} height={675} className="h-full w-full object-cover"/></div>}<div className="p-4"><time className="text-[10px] uppercase tracking-wider text-white/25">{new Date(item.created_at).toLocaleDateString()}</time><h3 className="mt-1 font-display text-lg font-black uppercase">{item.title}</h3>{item.description&&<p className="mt-2 text-sm leading-5 text-white/45">{item.description}</p>}</div></article>)}</div>}</section>}
      {tab==='history'&&<section><Title color={accent}>Franchise history</Title><p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">This is the permanent Rich City League home for {team.name}. Seasons, records and future accomplishments stay connected to this team identity rather than being replaced when a new season begins.</p><div className="mt-7 space-y-3">{[...seasons].sort((a,b)=>b.start_date.localeCompare(a.start_date)).map(s=>{const ts=teamSeasons.find(x=>x.season_id===s.id);const standing=standings.find(x=>x.season_id===s.id);return <div key={s.id} className="grid gap-3 border border-white/10 p-5 sm:grid-cols-[1fr_1fr_120px]"><div><p className="font-display text-xl font-black uppercase">{s.name}</p><p className="text-xs text-white/40">{s.start_date} — {s.end_date}</p></div><p className="text-sm text-white/50">{divisionById.get(ts?.division_id??'')?.name??'Division history pending'}</p><p className="font-display text-xl font-black sm:text-right">{standing?`${standing.wins}–${standing.losses}`:'—'}</p></div>})}</div></section>}

      <section className="mt-14 border-t border-white/10 pt-8"><p className="text-xs font-black uppercase tracking-[.28em] text-white/35">Nine teams · one city</p><div className="mt-4 flex gap-3 overflow-x-auto pb-3">{snapshot.teams.map(t=><Link key={t.id} href={`/teams/${t.slug}`} className={`min-w-[150px] border p-4 text-center ${t.id===team.id?'border-white/40 bg-white/[.05]':'border-white/10'}`}>{t.logo_url?<Image src={t.logo_url} alt={`${t.name} logo`} width={64} height={64} sizes="64px" className="mx-auto h-16 w-16 object-contain"/>:<div className="mx-auto h-16 w-16 rounded-xl" style={{backgroundColor:t.primary_color??'#ff6b1a'}}/>}<p className="mt-3 text-xs font-black uppercase">{t.name}</p></Link>)}</div></section>
    </div>
  </main>;
}
function Eyebrow({children,color}:{children:React.ReactNode;color:string}){return <p className="text-xs font-black uppercase tracking-[.28em]" style={{color}}>{children}</p>}
function Title({children,color}:{children:React.ReactNode;color:string}){return <div><Eyebrow color={color}>Team network</Eyebrow><h2 className="mt-2 font-display text-4xl font-black uppercase">{children}</h2></div>}
function Stat({label,value}:{label:string;value:string}){return <div className="border border-white/10 bg-white/[.025] p-4"><p className="text-xs font-black uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 font-display text-3xl font-black">{value}</p></div>}
function Row({a,b}:{a:string;b:string}){return <div className="flex justify-between gap-4 border-b border-white/5 pb-3"><dt className="text-white/35">{a}</dt><dd className="text-right font-bold">{b}</dd></div>}
function Empty({text}:{text:string}){return <div className="mt-6 border border-dashed border-white/15 p-10 text-center text-sm text-white/40">{text}</div>}
