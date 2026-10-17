import { Neighborhood } from '@/components/social/Neighborhood';
import { PublicCrewShowcase } from '@/components/commonwealth/PublicCrewShowcase';
import PlaceBadgeVault from '@/components/rep/PlaceBadgeVault';
import { RepProfileFrame } from '@/components/rep/RepProfileFrame';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { FaBasketball, FaLocationDot } from 'react-icons/fa6';
import { ProfileSoundtrack } from '@/components/ProfileSoundtrack';
import { PublicProfileActions } from '@/components/PublicProfileActions';
import { SocialIdentity } from '@/components/SocialIdentity';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { AchievementShareCard } from '@/components/AchievementShareCard';
import { BadgeMedallion, BadgeShowcaseCard } from '@/components/BadgeMedallion';
import { GrowthShareCard } from '@/components/GrowthShareCard';
import { ProfileViewInsights } from '@/components/ProfileViewInsights';
import { ProfileWallFeed, type WallPost } from '@/components/social/ProfileWallFeed';
import { ProfileFollowDirectory } from '@/components/social/ProfileFollowDirectory';
import { reputationProgress, reputationStatus } from '@/lib/reputation';
import {coachMilestones,type RCHCoachIdentity} from '@/lib/rch-coach-identity';


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
type ProfileTab = 'wall'|'posts'|'followers'|'following'|'highlights'|'stats'|'career'|'badges'|'media'|'coach';

const PROFILE_TABS: ProfileTab[] = ['wall','posts','followers','following','highlights','stats','career','badges','media','coach'];
const PROFILE_TAB_LABELS: Record<ProfileTab,string> = {
  wall:'Wall',
  posts:'Posts',
  followers:'Followers',
  following:'Following',
  highlights:'Highlights',
  stats:'Stats',
  career:'Career',
  badges:'Badges',
  media:'Media',
  coach:'Coaching',
};

export default async function SocialPublicProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string|string[] }> }) {
  const [{ id }, query] = await Promise.all([params,searchParams]);
  const activeTab = normalizeTab(query.tab);
  const client = await getServerSupabaseClient();
  if (!client) notFound();

  const { data: profile } = await client
    .from('profiles')
    .select('id,display_name,username,avatar_url,cover_url,bio,location,role,profile_visibility,profile_song_url,created_at,is_vip,vip_label,is_system_account,system_account_key,qualified_referral_count')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle() as any;

  if (!profile) notFound();

  const [
    { data: posts },
    { count: followers },
    { count: following },
    { data: repLevel },
    { data: repLedger },
    { data: earnedRepBadges },
    { data: playerRaw },
    { data: earnedCoachBadges },
    { data: coachIdentityRaw },
  ] = await Promise.all([
    client.from('posts').select('id,author_id,body,media_urls,created_at,is_automated,automation_type,target_profile_id').or(`author_id.eq.${id},target_profile_id.eq.${id}`).eq('status', 'published').order('created_at', { ascending: false }).limit(60) as any,
    client.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id) as any,
    client.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id) as any,
    client.from('user_levels').select('xp,level').eq('profile_id', id).maybeSingle() as any,
    client.from('xp_transactions').select('id,amount,reason,source_type,created_at').eq('profile_id', id).order('created_at', { ascending: false }).limit(20) as any,
    client.from('fan_badges').select('id,badge_id,earned_at,badge:badges(name,description,icon,tier,category,requirement_type)').eq('profile_id', id).order('earned_at', { ascending: false }) as any,
    client.from('players').select('id,profile_id,first_name,last_name,jersey_number,position,height_inches,hometown,photo_url').eq('profile_id', id).eq('is_active', true).maybeSingle() as any,
    client.from('coach_badges').select('id,badge_id,earned_at,badge:badges(name,description,icon,tier,category,requirement_type)').eq('profile_id', id).order('earned_at', { ascending: false }) as any,
    (client as any).from('rch_coach_identities').select('profile_id,headline,organization,city,years_experience,coaching_level,specialties,availability,published').eq('profile_id',id).eq('published',true).maybeSingle(),
  ]);
  const coachIdentity=coachIdentityRaw as RCHCoachIdentity|null;
  // An adult Royaltee affiliation decorates the same social profile; it never changes the account role.
  const {data:royalteeIdentityRaw}=await (client as any).from('rcl_royaltee_cheer_profiles').select('discipline,status,published').eq('profile_id',id).eq('status','approved').eq('published',true).maybeSingle();
  const royalteeIdentity=royalteeIdentityRaw as {discipline:string}|null;

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
  // An identity can collect fan/community, player and coach awards at once.
  // Deduplicate the same badge across award tables without losing its earliest unlock.
  const { data: earnedPlayerBadges } = player?.id
    ? await client.from('player_badges').select('id,badge_id,earned_at,badge:badges(name,description,icon,tier,category,requirement_type)').eq('player_id', player.id).order('earned_at', { ascending: false }) as any
    : { data: [] };
  const badgeAwards = [...(earnedRepBadges ?? []), ...(earnedCoachBadges ?? []), ...(earnedPlayerBadges ?? [])] as any[];
  const badgeById = new Map<string, any>();
  for (const award of badgeAwards) {
    if (!award.badge || !award.badge_id) continue;
    const existing = badgeById.get(award.badge_id);
    if (!existing || new Date(award.earned_at).getTime() < new Date(existing.earned_at).getTime()) {
      badgeById.set(award.badge_id, award);
    }
  }
  const allBadges = [...badgeById.values()].sort((a,b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());
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
    wall:postRows.length,
    posts:authoredPosts.length,
    followers:followers ?? 0,
    following:following ?? 0,
    highlights:highlightRows.length,
    stats:basketball?.games ?? 0,
    career:careerRows.length,
    badges:allBadges.length,
    media:mediaRows.length,
    coach:coachIdentity?coachMilestones(coachIdentity).length:0,
  };

  return <main className={'rcl-social-secondary rcl-social-profile rch-profile-finish min-h-screen bg-[#05080d] pb-28 text-white '+(profile.is_vip?'is-vip':'')}>
    <div className="mx-auto max-w-5xl">
      <section className="rch-profile-hero relative border-b border-white/10 bg-[#09111a]">
        <div className="rch-profile-cover h-44 overflow-hidden bg-[radial-gradient(circle_at_80%_15%,rgba(21,159,255,.2),transparent_35%),linear-gradient(135deg,#0a1b2a,#03070d)] sm:h-64">{profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="rch-profile-identity px-5 pb-6">
          <div className="-mt-14 flex items-end justify-between gap-4">
            <div className="rcl-profile-rep-ring relative" style={{'--profile-progress':progress+'%'} as React.CSSProperties}>
              <RepProfileFrame profileId={id} />
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-[#05080d] bg-white"><ProfileAvatarMedia src={profile.avatar_url} alt={name} className="h-full w-full object-cover" /></div><em>{socialLevel}</em>
            </div>
            <Link href="/social" className="rch-profile-home-link mb-2 rounded-xl border border-rcl-blue/25 bg-rcl-blue/5 px-4 py-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Home</Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-black uppercase sm:text-4xl">{name}</h1>
            {profile.is_vip&&<span title="RCL VIP verified member" className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-2.5 py-1 text-xs font-black uppercase tracking-[.14em] text-amber-300"><span className="grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-xs text-black">✓</span>{profile.vip_label||'VIP'}</span>}
            {profile.is_system_account&&<span className="rch-profile-official-chip rounded-full border border-rcl-blue/30 bg-rcl-blue/10 px-2.5 py-1 text-xs font-black uppercase tracking-[.14em] text-rcl-blue">RCL Official</span>}
          </div>
          {profile.username && <p className="text-sm text-white/35">@{profile.username}</p>}
          <div className="rch-profile-role-row mt-3 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-wider text-white/70"><span className="rounded-full bg-white/5 px-3 py-1">{coachIdentity?'RCH Coach':profile.role || 'member'}</span>{royalteeIdentity&&<Link href="/league/royaltee" className="rounded-full border border-[#ec8e4d]/60 bg-[#c7682b]/15 px-3 py-1 font-black text-[#ffb586]">Royaltee · Official 18+ Cheer + Step</Link>}{profile.location && <span className="flex items-center gap-1"><FaLocationDot />{profile.location}</span>}</div>
          {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{profile.bio}</p>}
          <PublicCrewShowcase profileId={profile.id} />
          <ProfileSoundtrack url={profile.profile_song_url} profileName={name} />
          {!profile.is_system_account && <PublicProfileActions profileId={profile.id} profileName={name} />}
          {!profile.is_system_account && <ProfileViewInsights profileId={profile.id} />}

          <div className={`rcl-profile-status-banner status-${repStatus.key}`}><small>REPUTATION STATUS</small><strong>{repStatus.label}</strong><span>Level {socialLevel} · {repProgress.remaining} REP to Level {socialLevel+1}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Profile statistics">
            <div className="flex min-h-20 flex-col justify-center rounded-xl border border-white/10 bg-[#071522] px-4 py-3"><b className="text-xl font-black text-rcl-blue">{repLabel}</b><span className="mt-1 text-xs font-bold uppercase tracking-wider text-white/65">REP</span></div>
            <Link href={profileHref+'?tab=followers'} aria-label={"View "+name+"\u0027s followers"} className="group flex min-h-20 flex-col justify-center rounded-xl border border-rcl-blue/25 bg-[#0b263c] px-4 py-3 transition hover:border-rcl-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-rcl-blue"><b className="text-xl font-black text-white group-hover:text-rcl-blue">{followers ?? 0}</b><span className="mt-1 text-xs font-bold uppercase tracking-wider text-white/70">Followers ↗</span></Link>
            <Link href={profileHref+'?tab=following'} aria-label={"View "+name+"\u0027s following"} className="group flex min-h-20 flex-col justify-center rounded-xl border border-rcl-blue/25 bg-[#0b263c] px-4 py-3 transition hover:border-rcl-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-rcl-blue"><b className="text-xl font-black text-white group-hover:text-rcl-blue">{following ?? 0}</b><span className="mt-1 text-xs font-bold uppercase tracking-wider text-white/70">Following ↗</span></Link>
            <div className="flex min-h-20 flex-col justify-center rounded-xl border border-white/10 bg-[#071522] px-4 py-3"><b className="text-xl font-black text-white">{profile.qualified_referral_count ?? 0}</b><span className="mt-1 text-xs font-bold uppercase tracking-wider text-white/65">Recruited</span></div>
          </div>
          <div className="rcl-profile-rep-progress"><i style={{width:progress+'%'}}/><small>Level {socialLevel} · reputation progress</small></div>
          {allBadges.length > 0 && <div className="mt-5 rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2"><b className="text-xs font-black uppercase tracking-[.15em] text-white/80">Achievement showcase</b><Link href={profileHref+'?tab=badges'} className="text-[11px] font-black uppercase tracking-wider text-rcl-blue">View all {allBadges.length} →</Link></div>
            <div className="flex flex-wrap items-start justify-start gap-3">
              {allBadges.slice(0, 3).map((award:any) => <Link key={award.badge_id} href={profileHref+'?tab=badges'} className="group flex w-24 flex-col items-center text-center" title={award.badge?.name}>
                <BadgeMedallion badge={award.badge} size="xs" />
                <span className="mt-1 line-clamp-2 text-[10px] font-bold leading-3 text-white/70">{award.badge?.name}</span>
              </Link>)}
            </div>
          </div>}
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

      {coachIdentity&&<section className="border-b border-[#38617f] bg-[#0b2840] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9bd1ff]">RCH COACHING IDENTITY · MEMBER PROFILE</p>
            <p className="mt-1 text-sm font-bold text-white">{coachIdentity.headline||'Basketball coach'}{coachIdentity.city?' · '+coachIdentity.city:''}</p>
            <p className="mt-1 text-xs text-[#c5d9e8]">Self-described background · Not an official RCL staff appointment</p></div>
          <Link href={profileHref+'?tab=coach'} className="rounded-xl border border-[#75adce] bg-[#174e76] px-4 py-2.5 text-xs font-bold text-white">Coaching details →</Link>
        </div>
      </section>}
      <nav className="rch-profile-tabs sticky top-16 z-30 border-b border-white/10 bg-[#05080d]/95 px-4 backdrop-blur-xl" aria-label="Profile sections">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROFILE_TABS.filter(tab=>tab!=='coach'||Boolean(coachIdentity)).map((tab)=>{
            const active=activeTab===tab;
            const href=tab==='wall'?profileHref:`${profileHref}?tab=${tab}`;
            return <Link key={tab} href={href} aria-current={active?'page':undefined} className={`relative shrink-0 px-4 py-4 text-xs font-black uppercase tracking-[.14em] transition ${active?'text-white':'text-white/35 hover:text-white/70'}`}>
              {PROFILE_TAB_LABELS[tab]} <span className={`ml-1 ${active?'text-rcl-orange':'text-white/20'}`}>{tabCounts[tab]}</span>
              {active&&<span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-rcl-orange"/>}
            </Link>;
          })}
        </div>
      </nav>

      <section className="px-4 py-6">
        {activeTab==='wall' && <div className="mb-6"><Neighborhood excludeProfileId={id} /></div>}
        {activeTab==='wall' && <PlaceBadgeVault profileId={id} />}
        {activeTab==='wall'&&<ProfileWallFeed profileId={id} profileName={name} allowVisitorPosts={!profile.is_system_account} initialPosts={postRows.map(post => ({...post, author:(authorMap.get(post.author_id) ?? null) as WallPost['author']}))} />}
        {activeTab==='posts'&&<ProfilePostList rows={authoredPosts} authorMap={authorMap} emptyTitle="No posts yet" emptyCopy="Posts created by this RCL identity will appear here." />}
        {(activeTab==='followers'||activeTab==='following')&&<ProfileFollowDirectory profileId={id} profileName={name} mode={activeTab} />}
        {activeTab==='highlights'&&<ProfilePostList rows={highlightRows} authorMap={authorMap} emptyTitle="No highlights yet" emptyCopy="Clips, media and official standout moments will build this highlight reel." />}
        {activeTab==='stats'&&<StatsTab player={player} basketball={basketball} profileLocation={profile.location} />}
        {activeTab==='career'&&<CareerTab basketball={basketball} rows={careerRows} authorMap={authorMap} />}
        {activeTab==='badges'&&<BadgesTab name={name} username={profile.username} repLabel={repLabel} repStatus={repStatus.label} socialLevel={socialLevel} followers={followers ?? 0} latestAchievement={latestAchievement} allBadges={allBadges} repRows={repRows} nextLevelXp={nextLevelXp} rep={rep} />}
        {activeTab==='badges' && <PlaceBadgeVault profileId={id}/>}
        {activeTab==='media'&&<MediaTab rows={mediaRows} />}
        {activeTab==='coach'&&(coachIdentity?<CoachMemberTab identity={coachIdentity} awards={(earnedCoachBadges??[]) as any[]}/>:<EmptyTab title="Coaching details are not published" copy="Coach identity is optional and controlled by each member."/>)}
      </section>
    </div>
  </main>;
}

function CoachMemberTab({identity,awards}:{identity:RCHCoachIdentity;awards:any[]}){
 const milestones=coachMilestones(identity);
 return <div className="space-y-5">
  <section className="overflow-hidden rounded-2xl border border-[#416b91] bg-[linear-gradient(135deg,#143e61,#071b2e)] p-5 sm:p-7">
   <p className="text-xs font-black uppercase tracking-[.16em] text-[#9bd0ff]">RCH Coaches Network</p>
   <h2 className="mt-3 text-2xl font-black text-white">{identity.headline||'Coaching identity'}</h2>
   {identity.organization&&<p className="mt-2 text-sm text-[#d1e6f6]">{identity.organization} · Self-reported organization</p>}
   <div className="mt-5 grid gap-3 sm:grid-cols-3">
    {[
      ['LOCATION',identity.city||'Not listed'],
      ['COACHING LEVEL',identity.coaching_level||'Not listed'],
      ['EXPERIENCE',identity.years_experience==null?'Not listed':identity.years_experience+' years (self-reported)'],
    ].map(([label,value])=><div key={label} className="rounded-xl border border-[#396485] bg-[#0a2034] p-4"><small className="block text-[10px] font-black tracking-widest text-[#a9d1eb]">{label}</small><strong className="mt-2 block text-sm text-white">{value}</strong></div>)}
   </div>
   {identity.specialties.length>0&&<div className="mt-5"><h3 className="text-xs font-black uppercase tracking-wider text-[#acd9f8]">Coaching specialties</h3><div className="mt-3 flex flex-wrap gap-2">{identity.specialties.map(s=><span key={s} className="rounded-xl border border-[#5083a8] bg-[#173c5e] px-3 py-2 text-xs font-bold text-white">{s}</span>)}</div></div>}
   {identity.availability==='open_to_opportunities'&&<p className="mt-5 rounded-lg border border-[#438f7e] bg-[#143f3a] p-3 text-xs font-bold text-[#b7f5dc]">Open to coaching opportunities · Contact through RCH messages</p>}
   <p className="mt-5 text-xs leading-5 text-[#bcd1e2]">This is a regular member’s coaching background. Experience and affiliations are self-reported. RCH does not certify or appoint coaches through directory membership.</p>
  </section>
  <section className="rounded-2xl border border-[#456a8b] bg-[#0c243a] p-5 sm:p-7">
   <h3 className="text-lg font-black text-white">Coaching milestones</h3>
   <p className="mt-2 text-xs leading-5 text-[#bfdaec]">Earned for profile participation. These are not certifications or verified coaching achievements.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">{milestones.map(item=><div key={item.id} className="flex items-start gap-3 rounded-xl border border-[#4e7ba0] bg-[#173e60] p-4"><span className="grid h-10 w-10 flex-none place-items-center rounded-full border border-[#80b4da] bg-[#225982] text-xl text-[#d7f2ff]">✦</span><span><strong className="block text-sm text-white">{item.name}</strong><small className="mt-1 block text-xs text-[#c5d9e8]">{item.description}</small></span></div>)}</div>
  </section>
  <section className="rounded-2xl border border-[#456a8b] bg-[#0c243a] p-5 sm:p-7">
   <h3 className="text-lg font-black text-white">Official coaching badges</h3>
   {awards.some(a=>a.badge)?<div className="mt-4 flex flex-wrap gap-4">{awards.filter(a=>a.badge).map((item:any)=><BadgeShowcaseCard key={item.id} badge={item.badge} earnedAt={item.earned_at} compact/>)}</div>:<p className="mt-3 text-sm leading-6 text-[#c1d6e7]">No awarded coaching badges yet. Official awards appear when issued by the league—not when a member enters their own history.</p>}
  </section>
  <div className="flex flex-wrap gap-3"><Link href="/coaches" className="inline-flex min-h-11 items-center rounded-xl border border-[#4e7da4] bg-[#123b5b] px-5 text-sm font-bold text-white">Explore RCH coaches</Link><Link href="/profile" className="inline-flex min-h-11 items-center rounded-xl border border-[#4e7da4] bg-[#123b5b] px-5 text-sm font-bold text-white">Edit my profile</Link></div>
 </div>;
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
    {allBadges.length?<div className="mb-5 rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-4 sm:p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Achievements</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Badge collection</h2></div><span className="text-xs font-black uppercase text-white/45">{allBadges.length} earned</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{allBadges.map((item:any)=><BadgeShowcaseCard key={item.badge_id} badge={item.badge} earnedAt={item.earned_at} compact />)}</div></div>:<EmptyTab title="No badges yet" copy="Earned RCH achievements will collect here permanently."/>}
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
  return PROFILE_TABS.includes(candidate as ProfileTab)?candidate as ProfileTab:'wall';
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
