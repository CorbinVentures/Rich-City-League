import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicClient } from '@/lib/public-data';
import { FaBasketball, FaLocationDot } from 'react-icons/fa6';
import { ProfileSoundtrack } from '@/components/ProfileSoundtrack';
import { PublicProfileActions } from '@/components/PublicProfileActions';
import { SocialIdentity } from '@/components/SocialIdentity';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { AchievementShareCard } from '@/components/AchievementShareCard';
import { GrowthShareCard } from '@/components/GrowthShareCard';
import { ProfileViewInsights } from '@/components/ProfileViewInsights';
import { reputationProgress, reputationStatus } from '@/lib/reputation';

export const revalidate = 30;

type PlayerRow = {
  id:string;
  profile_id:string|null;
  first_name:string|null;
  last_name:string|null;
  jersey_number:string|null;
  position:string|null;
  height_inches:number|null;
  hometown:string|null;
  photo_url:string|null;
};

type StatRow = { game_id:string; points:number|null; rebounds:number|null; assists:number|null; steals:number|null; blocks:number|null; plus_minus:number|null };
type ProfilePost = { id:string; author_id:string; body:string; media_urls:string[]; created_at:string; is_automated?:boolean; automation_type?:string|null; target_profile_id?:string|null };
type ProfileTab = 'posts'|'highlights'|'stats'|'career'|'badges'|'media';

const PROFILE_TABS: ProfileTab[] = ['posts','highlights','stats','career','badges','media'];
const PROFILE_TAB_LABELS: Record<ProfileTab,string> = {
  posts:'Posts',
  highlights:'Highlights',
  stats:'Stats',
  career:'Career',
  badges:'Badges',
  media:'Media',
};

export default async function SocialPublicProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string|string[] }> }) {
  const [{ id }, query] = await Promise.all([params,searchParams]);
  const activeTab = normalizeTab(query.tab);
  const client = getPublicClient();
  if (!client) notFound();

  const { data: profile } = await client
    .from('profiles')
    .select('id,display_name,username,avatar_url,cover_url,bio,location,role,profile_visibility,profile_song_url,created_at,is_vip,vip_label,is_system_account,system_account_key,qualified_referral_count')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle() as any;

  if (!profile || profile.profile_visibility === 'private') notFound();

  const [
    { data: posts },
    { count: followers },
    { count: following },
    { data: repLevel },
    { data: repLedger },
    { data: earnedRepBadges },
    { data: playerRaw },
  ] = await Promise.all([
    client.from('posts').select('id,author_id,body,media_urls,created_at,is_automated,automation_type,target_profile_id').or(`author_id.eq.${id},target_profile_id.eq.${id}`).eq('status', 'published').order('created_at', { ascending: false }).limit(60) as any,
    client.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id) as any,
    client.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id) as any,
    client.from('user_levels').select('xp,level').eq('profile_id', id).maybeSingle() as any,
    client.from('xp_transactions').select('id,amount,reason,source_type,created_at').eq('profile_id', id).order('created_at', { ascending: false }).limit(20) as any,
    client.from('fan_badges').select('id,earned_at,badge:badges(name,description,icon,tier,requirement_type)').eq('profile_id', id).order('earned_at', { ascending: false }) as any,
    client.from('players').select('id,profile_id,first_name,last_name,jersey_number,position,height_inches,hometown,photo_url').eq('profile_id', id).eq('is_active', true).maybeSingle() as any,
  ]);

  const player = playerRaw as PlayerRow | null;
  let basketball: null | {
    team:{id:string;name:string;slug:string|null;logo_url:string|null}|null;
    seasonName:string|null;
    isCaptain:boolean;
    joinedAt:string|null;
    iq:{rcl_rating:number|null;player_archetype:string|null;rating_trend:string|null;games_evaluated:number|null}|null;
    games:number;
    ppg:number;
    rpg:number;
    apg:number;
    spg:number;
    bpg:number;
  } = null;

  if (player?.id) {
    const [{ data: rosterRaw }, { data: iqRaw }] = await Promise.all([
      client.from('rosters').select('team_season_id,is_captain,joined_at,left_at').eq('player_id', player.id).is('left_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle() as any,
      client.from('public_player_iq').select('rcl_rating,player_archetype,rating_trend,games_evaluated').eq('player_id', player.id).maybeSingle() as any,
    ]);

    let team: {id:string;name:string;slug:string|null;logo_url:string|null} | null = null;
    let seasonName: string | null = null;
    let seasonId: string | null = null;
    const roster = rosterRaw as {team_season_id?:string;is_captain?:boolean;joined_at?:string|null}|null;

    if (roster?.team_season_id) {
      const { data: teamSeason } = await client.from('team_seasons').select('team_id,season_id').eq('id', roster.team_season_id).maybeSingle() as any;
      if (teamSeason?.team_id) {
        const { data: teamRaw } = await client.from('teams').select('id,name,slug,logo_url').eq('id', teamSeason.team_id).maybeSingle() as any;
        team = teamRaw ?? null;
      }
      if (teamSeason?.season_id) {
        seasonId = teamSeason.season_id;
        const { data: seasonRaw } = await client.from('seasons').select('name').eq('id', teamSeason.season_id).maybeSingle() as any;
        seasonName = seasonRaw?.name ?? null;
      }
    }

    const gamesQuery = client.from('games').select('id').eq('status', 'completed');
    const { data: completedGames } = seasonId ? await gamesQuery.eq('season_id', seasonId) as any : await gamesQuery.limit(250) as any;
    const gameIds = (completedGames ?? []).map((game:any) => game.id);
    const { data: statsRaw } = gameIds.length
      ? await client.from('player_game_stats').select('game_id,points,rebounds,assists,steals,blocks,plus_minus').eq('player_id', player.id).in('game_id', gameIds) as any
      : { data: [] };

    const stats = (statsRaw ?? []) as StatRow[];
    const games = stats.length;
    const average = (key:keyof Omit<StatRow,'game_id'>) => games ? stats.reduce((sum,row)=>sum + Number(row[key] ?? 0),0) / games : 0;
    basketball = {
      team,
      seasonName,
      isCaptain:Boolean(roster?.is_captain),
      joinedAt:roster?.joined_at ?? null,
      iq:iqRaw ? {
        rcl_rating:iqRaw.rcl_rating == null ? null : Number(iqRaw.rcl_rating),
        player_archetype:iqRaw.player_archetype ?? null,
        rating_trend:iqRaw.rating_trend ?? null,
        games_evaluated:iqRaw.games_evaluated ?? null,
      } : null,
      games,
      ppg:average('points'),
      rpg:average('rebounds'),
      apg:average('assists'),
      spg:average('steals'),
      bpg:average('blocks'),
    };
  }

  const postRows = (posts ?? []) as ProfilePost[];
  const authorIds = [...new Set(postRows.map((post) => post.author_id))];
  const { data: authors } = authorIds.length ? await client.from('profiles').select('id,display_name,username,avatar_url,is_vip,vip_label,is_system_account,system_account_key').in('id', authorIds) as any : { data: [] };
  const { data: authorLevels } = authorIds.length ? await client.from('user_levels').select('profile_id,xp,level').in('profile_id', authorIds) as any : { data: [] };
  const levelMap = new Map((authorLevels ?? []).map((row:any) => [row.profile_id, row]));
  const authorMap = new Map((authors ?? []).map((author:any) => { const row:any = levelMap.get(author.id); return [author.id, {...author, rep:row?.xp ?? 0, level:row?.level ?? 1}]; }));

  const name = profile.display_name || profile.username || 'RCL Member';
  const rep = repLevel?.xp ?? 0;
  const socialLevel = repLevel?.level ?? 1;
  const repLabel = rep >= 1000 ? (rep/1000).toFixed(1)+'K' : String(rep);
  const repProgress = reputationProgress(rep, socialLevel);
  const progress = repProgress.percent;
  const nextLevelXp = repProgress.next;
  const repStatus = reputationStatus(socialLevel);
  const repRows = (repLedger ?? []) as Array<{id:string;amount:number;reason:string;source_type:string|null;created_at:string}>;
  const allBadges = (earnedRepBadges ?? []) as any[];
  const latestAchievement = allBadges[0];

  const authoredPosts = postRows.filter((post)=>post.author_id===id);
  const careerRows = postRows.filter((post)=>post.target_profile_id===id && post.author_id!==id && post.is_automated);
  const highlightRows = postRows.filter((post)=>
    (post.media_urls?.length ?? 0) > 0 ||
    ['game_star','badge_unlock','draft_pick_round1'].includes(post.automation_type ?? '') ||
    /highlight|dunk|game winner|poster|bucket/i.test(post.body)
  );
  const mediaRows = postRows.filter((post)=>(post.media_urls?.length ?? 0) > 0);
  const profileHref = `/social/profile/${id}`;
  const tabCounts:Record<ProfileTab,number> = {
    posts:authoredPosts.length,
    highlights:highlightRows.length,
    stats:basketball?.games ?? 0,
    career:careerRows.length,
    badges:allBadges.length,
    media:mediaRows.length,
  };

  return <main className={'rcl-social-secondary rcl-social-profile min-h-screen bg-[#05080d] pb-28 text-white '+(profile.is_vip?'is-vip':'')}>
    <div className="mx-auto max-w-5xl">
      <section className="relative border-b border-white/10 bg-[#09111a]">
        <div className="h-44 overflow-hidden bg-[radial-gradient(circle_at_80%_15%,rgba(21,159,255,.2),transparent_35%),linear-gradient(135deg,#0a1b2a,#03070d)] sm:h-64">{profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="px-5 pb-6">
          <div className="-mt-14 flex items-end justify-between gap-4">
            <div className="rcl-profile-rep-ring" style={{'--profile-progress':progress+'%'} as React.CSSProperties}>
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-[#05080d] bg-white"><ProfileAvatarMedia src={profile.avatar_url} alt={name} className="h-full w-full object-cover" /></div><em>{socialLevel}</em>
            </div>
            <Link href="/social" className="mb-2 rounded-xl border border-rcl-blue/25 bg-rcl-blue/5 px-4 py-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Home</Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-black uppercase sm:text-4xl">{name}</h1>
            {profile.is_vip&&<span title="RCL VIP verified member" className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-2.5 py-1 text-xs font-black uppercase tracking-[.14em] text-amber-300"><span className="grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-xs text-black">✓</span>{profile.vip_label||'VIP'}</span>}
            {profile.is_system_account&&<span className="rounded-full border border-rcl-blue/30 bg-rcl-blue/10 px-2.5 py-1 text-xs font-black uppercase tracking-[.14em] text-rcl-blue">RCL Official</span>}
          </div>
          {profile.username && <p className="text-sm text-white/35">@{profile.username}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-wider text-white/35"><span className="rounded-full bg-white/5 px-3 py-1">{profile.role || 'member'}</span>{profile.location && <span className="flex items-center gap-1"><FaLocationDot />{profile.location}</span>}</div>
          {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{profile.bio}</p>}
          <ProfileSoundtrack url={profile.profile_song_url} profileName={name} />
          {!profile.is_system_account && <PublicProfileActions profileId={profile.id} profileName={name} />}
          {!profile.is_system_account && <ProfileViewInsights profileId={profile.id} />}

          <div className={`rcl-profile-status-banner status-${repStatus.key}`}><small>REPUTATION STATUS</small><strong>{repStatus.label}</strong><span>Level {socialLevel} · {repProgress.remaining} REP to Level {socialLevel+1}</span></div>
          <div className="rcl-profile-metrics mt-5"><span><b>{repLabel}</b><small>REP</small></span><span><b>{followers ?? 0}</b><small>Followers</small></span><span><b>{following ?? 0}</b><small>Following</small></span><span><b>{profile.qualified_referral_count ?? 0}</b><small>Recruited</small></span></div>
          <div className="rcl-profile-rep-progress"><i style={{width:progress+'%'}}/><small>Level {socialLevel} · reputation progress</small></div>
        </div>
      </section>

      {player && basketball && <section className="border-b border-white/10 bg-[#07111a] px-4 py-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-rcl-blue/15 bg-[#071522]/65 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Basketball identity</p>
            <div className="mt-1 flex flex-wrap items-center gap-2"><b className="font-display text-xl uppercase">{player.position || 'Player'}{player.jersey_number?` · #${player.jersey_number}`:''}</b>{basketball.isCaptain&&<span className="rounded-full bg-rcl-orange/10 px-2 py-1 text-xs font-black uppercase text-rcl-orange">Captain</span>}</div>
            <p className="mt-1 text-xs text-white/40">{[basketball.team?.name,basketball.seasonName].filter(Boolean).join(' · ') || 'RCL Player'}</p>
          </div>
          <div className="grid grid-cols-4 gap-1 sm:min-w-[360px]">
            <MiniMetric label="PPG" value={basketball.ppg.toFixed(1)} />
            <MiniMetric label="RPG" value={basketball.rpg.toFixed(1)} />
            <MiniMetric label="APG" value={basketball.apg.toFixed(1)} />
            <MiniMetric label="RCL" value={basketball.iq?.rcl_rating == null?'—':Math.round(basketball.iq.rcl_rating)} />
          </div>
        </div>
      </section>}

      <nav className="sticky top-16 z-30 border-b border-white/10 bg-[#05080d]/95 px-4 backdrop-blur-xl" aria-label="Profile sections">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROFILE_TABS.map((tab)=>{
            const active=activeTab===tab;
            const href=tab==='posts'?profileHref:`${profileHref}?tab=${tab}`;
            return <Link key={tab} href={href} className={`relative shrink-0 px-4 py-4 text-xs font-black uppercase tracking-[.14em] transition ${active?'text-white':'text-white/35 hover:text-white/70'}`}>
              {PROFILE_TAB_LABELS[tab]} <span className={`ml-1 ${active?'text-rcl-orange':'text-white/20'}`}>{tabCounts[tab]}</span>
              {active&&<span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-rcl-orange"/>}
            </Link>;
          })}
        </div>
      </nav>

      <section className="px-4 py-6">
        {activeTab==='posts'&&<ProfilePostList rows={authoredPosts} authorMap={authorMap} emptyTitle="No posts yet" emptyCopy="Posts created by this RCL identity will appear here." />}
        {activeTab==='highlights'&&<ProfilePostList rows={highlightRows} authorMap={authorMap} emptyTitle="No highlights yet" emptyCopy="Clips, media and official standout moments will build this highlight reel." />}
        {activeTab==='stats'&&<StatsTab player={player} basketball={basketball} profileLocation={profile.location} />}
        {activeTab==='career'&&<CareerTab basketball={basketball} rows={careerRows} authorMap={authorMap} />}
        {activeTab==='badges'&&<BadgesTab name={name} username={profile.username} repLabel={repLabel} repStatus={repStatus.label} socialLevel={socialLevel} followers={followers ?? 0} latestAchievement={latestAchievement} allBadges={allBadges} repRows={repRows} nextLevelXp={nextLevelXp} rep={rep} />}
        {activeTab==='media'&&<MediaTab rows={mediaRows} />}
      </section>
    </div>
  </main>;
}

function MiniMetric({label,value}:{label:string;value:string|number}){
  return <div className="rounded-xl bg-black/20 px-2 py-2 text-center"><small className="block text-[10px] font-black uppercase tracking-wider text-white/25">{label}</small><b className="mt-0.5 block font-display text-lg">{value}</b></div>;
}

function ProfilePostList({rows,authorMap,emptyTitle,emptyCopy}:{rows:ProfilePost[];authorMap:Map<any,any>;emptyTitle:string;emptyCopy:string}){
  if(!rows.length)return <EmptyTab title={emptyTitle} copy={emptyCopy}/>;
  return <div className="space-y-3">{rows.map((post)=>{const author:any=authorMap.get(post.author_id);return <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#08111b]/80">
    <div className="p-4 sm:p-5"><SocialIdentity author={author} compact/><div className="mt-3 flex flex-wrap items-center gap-2">{post.is_automated&&<span className="rounded-full border border-rcl-blue/20 bg-rcl-blue/5 px-2 py-1 text-xs font-black uppercase tracking-wider text-rcl-blue">Official activity</span>}{post.automation_type&&<span className="text-xs font-black uppercase tracking-wider text-white/25">{post.automation_type.replace(/_/g,' ')}</span>}</div><ProfileRichBody body={post.body}/></div>
    {post.media_urls?.[0]&&<div className="border-y border-white/10 bg-black">{isVideoUrl(post.media_urls[0])?<video src={post.media_urls[0]} controls playsInline className="max-h-[620px] w-full object-contain"/>:<img src={post.media_urls[0]} alt="Post media" className="max-h-[620px] w-full object-cover"/>}</div>}
    <div className="flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/25 sm:px-5"><span>{new Date(post.created_at).toLocaleDateString()}</span><Link href={`/social/post/${post.id}`} className="text-rcl-blue transition hover:text-rcl-orange">Open post</Link></div>
  </article>})}</div>;
}

function StatsTab({player,basketball,profileLocation}:{player:PlayerRow|null;basketball:any;profileLocation:string|null}){
  if(!player||!basketball)return <EmptyTab title="No official stats yet" copy="Basketball stats appear after this identity is connected to an active RCL player record and official game data."/>;
  return <div className="overflow-hidden rounded-3xl border border-rcl-blue/20 bg-[linear-gradient(145deg,#0a1b2a,#050b12)]">
    <div className="flex flex-col gap-5 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">Official performance</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="font-display text-3xl font-black uppercase">{player.position || 'Player'} {player.jersey_number?`· #${player.jersey_number}`:''}</h2>{basketball.isCaptain&&<span className="rounded-full border border-rcl-orange/30 bg-rcl-orange/10 px-3 py-1 text-xs font-black uppercase text-rcl-orange">Captain</span>}</div><p className="mt-2 text-sm text-white/45">{[basketball.team?.name,basketball.seasonName].filter(Boolean).join(' · ') || 'RCL Player'}</p></div>
      {basketball.team&&<Link href={`/teams/${basketball.team.slug || basketball.team.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-rcl-blue/35">{basketball.team.logo_url?<img src={basketball.team.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain"/>:<span className="grid h-10 w-10 place-items-center rounded-lg bg-rcl-blue/10 text-rcl-blue"><FaBasketball/></span>}<span><small className="block text-xs font-black uppercase tracking-wider text-white/30">Current team</small><b className="text-sm">{basketball.team.name}</b></span></Link>}
    </div>
    <div className="grid gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-6"><IdentityMetric label="GP" value={basketball.games} detail="Games"/><IdentityMetric label="PPG" value={basketball.ppg.toFixed(1)} detail="Points"/><IdentityMetric label="RPG" value={basketball.rpg.toFixed(1)} detail="Rebounds"/><IdentityMetric label="APG" value={basketball.apg.toFixed(1)} detail="Assists"/><IdentityMetric label="SPG" value={basketball.spg.toFixed(1)} detail="Steals"/><IdentityMetric label="BPG" value={basketball.bpg.toFixed(1)} detail="Blocks"/></div>
    <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><small className="text-xs font-black uppercase tracking-[.16em] text-rcl-blue">Player profile</small><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><ProfileFact label="Position" value={player.position || '—'}/><ProfileFact label="Height" value={formatHeight(player.height_inches)}/><ProfileFact label="Hometown" value={player.hometown || profileLocation || '—'}/><ProfileFact label="Jersey" value={player.jersey_number?`#${player.jersey_number}`:'—'}/></div></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><small className="text-xs font-black uppercase tracking-[.16em] text-rcl-orange">RCL Rating</small>{basketball.iq?.rcl_rating!=null?<><div className="mt-2 flex items-end gap-3"><strong className="font-display text-5xl font-black">{Math.round(basketball.iq.rcl_rating)}</strong><span className="pb-1 text-xs font-black uppercase tracking-wider text-white/35">{basketball.iq.rating_trend || 'Evaluated'}</span></div><p className="mt-2 text-sm text-white/50">{basketball.iq.player_archetype || 'RCL player archetype'} · {basketball.iq.games_evaluated ?? basketball.games} games evaluated</p></>:<><strong className="mt-2 block font-display text-3xl font-black text-white/35">UNRATED</strong><p className="mt-2 text-sm text-white/35">RCL Rating appears after enough official game data is available.</p></>}</div></div>
  </div>;
}

function CareerTab({basketball,rows,authorMap}:{basketball:any;rows:ProfilePost[];authorMap:Map<any,any>}){
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/60 p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Current chapter</p><h2 className="mt-2 font-display text-2xl font-black uppercase">{basketball?.team?.name || 'RCL Member'}</h2><p className="mt-2 text-sm text-white/40">{basketball?.seasonName || 'Official team and season history will appear as this identity participates in RCL.'}</p>{basketball?.joinedAt&&<p className="mt-4 text-xs font-black uppercase tracking-wider text-white/25">Joined {new Date(basketball.joinedAt).toLocaleDateString()}</p>}</div><div className="rounded-2xl border border-rcl-orange/15 bg-rcl-orange/[.035] p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Verified moments</p><strong className="mt-2 block font-display text-4xl font-black">{rows.length}</strong><p className="mt-2 text-sm text-white/40">Official game, draft, badge, REP and league moments attached to this identity.</p></div></div>
    <ProfilePostList rows={rows} authorMap={authorMap} emptyTitle="Career timeline is just getting started" emptyCopy="Verified league moments will collect here as this member plays, earns and participates."/>
  </div>;
}

function BadgesTab({name,username,repLabel,repStatus,socialLevel,followers,latestAchievement,allBadges,repRows,nextLevelXp,rep}:{name:string;username:string|null;repLabel:string;repStatus:string;socialLevel:number;followers:number;latestAchievement:any;allBadges:any[];repRows:Array<{id:string;amount:number;reason:string;source_type:string|null;created_at:string}>;nextLevelXp:number;rep:number}){
  return <div>
    <div className="mb-5 grid gap-4 sm:grid-cols-2"><GrowthShareCard memberName={name} memberUsername={username} eyebrow="RCL Reputation" headline="REP Milestone" value={repLabel+' REP'} detail={repStatus+' · Level '+socialLevel+' — reputation earned through RCL activity.'} icon="⚡"/><GrowthShareCard memberName={name} memberUsername={username} eyebrow="RCL Community" headline="Social Reach" value={String(followers)} detail="Followers connected to this RCL identity." icon="🏀"/></div>
    {latestAchievement&&<div className="mb-5"><AchievementShareCard memberName={name} memberUsername={username} badgeName={latestAchievement.badge?.name || 'RCL Achievement'} badgeDescription={latestAchievement.badge?.description} badgeIcon={latestAchievement.badge?.icon} badgeTier={latestAchievement.badge?.tier} earnedAt={latestAchievement.earned_at}/></div>}
    {allBadges.length?<div className="mb-5 rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Achievements</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Badge collection</h2></div><span className="text-xs font-black uppercase text-white/25">{allBadges.length} earned</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{allBadges.map((item:any)=><article key={item.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/15 p-3"><i className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-orange/10 not-italic text-2xl">{item.badge?.icon||'🏆'}</i><span className="min-w-0"><b className="block text-sm">{item.badge?.name || 'RCL Badge'}</b><small className="mt-1 block text-xs leading-5 text-white/35">{item.badge?.description || 'RCL achievement'}</small><em className="mt-1 block text-[10px] font-black uppercase not-italic tracking-wider text-rcl-blue">{item.badge?.tier || 'earned'}</em></span></article>)}</div></div>:<EmptyTab title="No badges yet" copy="Earned RCL achievements will collect here permanently."/>}
    <div className="rcl-profile-rep-ledger"><div className="rcl-rep-ledger-heading"><div><small>REPUTATION</small><h2>REP Activity</h2></div><span>{Math.max(0,nextLevelXp-rep)} REP to Level {socialLevel+1}</span></div>{repRows.length?<div>{repRows.slice(0,8).map((item)=><article key={item.id}><b>+{item.amount}</b><span><strong>{repReasonLabel(item.reason)}</strong><small>{item.source_type || 'RCL activity'} · {new Date(item.created_at).toLocaleDateString()}</small></span></article>)}</div>:<p>REP history will appear here as this identity contributes to RCL.</p>}</div>
  </div>;
}

function MediaTab({rows}:{rows:ProfilePost[]}){
  if(!rows.length)return <EmptyTab title="No media yet" copy="Photos and videos attached to this identity will appear here."/>;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((post)=>{const media=post.media_urls?.[0];if(!media)return null;return <Link key={post.id} href={`/social/post/${post.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-black"><div className="aspect-square overflow-hidden">{isVideoUrl(media)?<video src={media} muted playsInline className="h-full w-full object-cover"/>:<img src={media} alt="RCL media" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"/>}</div><div className="border-t border-white/10 p-3"><p className="line-clamp-2 text-xs leading-5 text-white/50">{post.body}</p><span className="mt-2 block text-[10px] font-black uppercase tracking-wider text-rcl-blue">Open post</span></div></Link>})}</div>;
}

function ProfileRichBody({body}:{body:string}){
  const parts=body.split(/(https?:\/\/[^\s<]+|\/(?:games|draft|runs|fantasy|social\/profile)(?:\/[^\s<]*)?)/g);
  return <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-6 text-white/80">{parts.map((part,index)=>{
    if(/^https?:\/\//.test(part))return <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-rcl-orange underline decoration-rcl-orange/30 underline-offset-2">{part}</a>;
    if(/^\/(?:games|draft|runs|fantasy|social\/profile)/.test(part))return <Link key={index} href={part} className="font-bold text-rcl-blue underline decoration-rcl-blue/30 underline-offset-2">{part}</Link>;
    return part;
  })}</p>;
}

function EmptyTab({title,copy}:{title:string;copy:string}){
  return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.015] px-5 py-12 text-center"><FaBasketball className="mx-auto text-3xl text-rcl-blue/40"/><h2 className="mt-4 font-display text-2xl font-black uppercase">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">{copy}</p></div>;
}

function IdentityMetric({label,value,detail}:{label:string;value:string|number;detail:string}){
  return <div className="bg-[#071522] p-4 text-center"><small className="text-xs font-black uppercase tracking-[.16em] text-white/30">{label}</small><strong className="mt-1 block font-display text-2xl font-black">{value}</strong><span className="text-xs text-white/35">{detail}</span></div>;
}

function ProfileFact({label,value}:{label:string;value:string}){
  return <div><small className="block text-xs font-black uppercase tracking-wider text-white/25">{label}</small><b className="mt-1 block text-sm text-white/75">{value}</b></div>;
}

function normalizeTab(value:string|string[]|undefined):ProfileTab{
  const candidate=Array.isArray(value)?value[0]:value;
  return PROFILE_TABS.includes(candidate as ProfileTab)?candidate as ProfileTab:'posts';
}

function formatHeight(inches:number|null){
  if (!inches) return '—';
  return `${Math.floor(inches/12)}'${inches%12}\"`;
}

function repReasonLabel(reason:string){
  return ({quality_content:'Quality content',meaningful_engagement:'Meaningful engagement',community_contribution:'Community contribution',profile_completed:'Profile completed',joined_team:'Joined a team',played_game:'Played a game',won_game:'Won a game',stat_milestone:'Stat milestone',invite_teammate:'Invited a teammate'} as Record<string,string>)[reason] || reason.split('_').join(' ');
}

function isVideoUrl(url:string){
  return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);
}
