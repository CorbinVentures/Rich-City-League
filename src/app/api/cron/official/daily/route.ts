import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OfficialAccount =
  | 'rcl'
  | 'rcl-gameday'
  | 'rcl-rep'
  | 'rcl-runs'
  | 'rcl-community'
  | 'rcl-fantasy'
  | 'rcl-history';

type Clock = { hour: number; dateKey: string; dateLabel: string; dayIndex: number };
type GameRow = { id: string; scheduled_at: string; home_team_id: string; away_team_id: string };
type TeamRow = { id: string; name: string };
type LevelRow = { profile_id: string; xp: number; level: number };
type ProfileRow = { id: string; display_name: string | null; username: string | null; is_system_account: boolean };
type RunRow = { title: string; court_name: string | null; location: string; starts_at: string };
type FantasyTeamRow = { name: string; wins: number; losses: number; total_points: number | string | null };

const schedule: Record<number, OfficialAccount[]> = {
  9: ['rcl'],
  11: ['rcl-gameday'],
  13: ['rcl-rep'],
  15: ['rcl-runs'],
  16: ['rcl-community'],
  18: ['rcl-fantasy'],
  19: ['rcl-history'],
};

const historyFacts = [
  'Rich City League was founded in Richmond in 2011 around competition, community pride and the love of basketball.',
  'RCL grew from a local summer streetball concept into an organized basketball environment where players could compete, be seen and represent Richmond.',
  'RCL history includes collaborations with the Goodman League and Entertainers Basketball Classic, plus recognition from SLAM Magazine and local media.',
  'The last full season of the earlier RCL era closed in 2023, setting up the current rebuild.',
  'The 2026 rebuild expands RCL beyond league play into technology, media, analytics, fantasy competition, social community and league operations.',
  'RCL was built around a simple idea: Richmond basketball deserves its own platform for competition, recognition, relationships and city pride.',
  'The technology is new, but the purpose is not: give Richmond basketball a platform that preserves the culture while building what comes next.',
];

function easternClock(date = new Date()): Clock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: 'year' | 'month' | 'day' | 'hour') => parts.find(part => part.type === type)?.value || '';
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = Number(value('hour'));
  const dateKey = `${year}-${month}-${day}`;
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
  const dayIndex = Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000);
  return { hour, dateKey, dateLabel, dayIndex };
}

function sourceUuid(seed: string) {
  const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

async function buildRclPost(db: SupabaseClient, clock: Clock) {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const [members, games, runs] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_system_account', false),
    db.from('games').select('id', { count: 'exact', head: true }).gte('scheduled_at', now.toISOString()).lt('scheduled_at', week),
    db.from('runs').select('id', { count: 'exact', head: true }).eq('status', 'open').gte('starts_at', now.toISOString()),
  ]);
  return `🏀 TODAY IN RCL · ${clock.dateLabel.toUpperCase()}\n\n${members.count || 0} active members · ${games.count || 0} official games in the next 7 days · ${runs.count || 0} open runs on the board.\n\nExplore the Network, check the league schedule and keep building your basketball identity.\n\n/social · /schedule · /runs\n\n#RichCityLeague #RCLNetwork`;
}

async function buildGameDayPost(db: SupabaseClient, clock: Clock) {
  const now = new Date();
  const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const gamesResult = await db.from('games')
    .select('id,scheduled_at,home_team_id,away_team_id')
    .gte('scheduled_at', now.toISOString())
    .lt('scheduled_at', next24)
    .order('scheduled_at', { ascending: true })
    .limit(3);
  const games = (gamesResult.data || []) as GameRow[];
  if (!games.length) {
    return `🏀 RCL GAMEDAY · ${clock.dateLabel.toUpperCase()}\n\nNo official RCL games are scheduled in the next 24 hours. The Game Center stays live for the next matchup, scores and official stats.\n\n/games\n\n#RCLGameDay #RichCityLeague`;
  }
  const teamIds = [...new Set(games.flatMap(game => [game.home_team_id, game.away_team_id]).filter(Boolean))];
  const teamsResult = teamIds.length ? await db.from('teams').select('id,name').in('id', teamIds) : null;
  const teams = (teamsResult?.data || []) as TeamRow[];
  const names = new Map(teams.map(team => [team.id, team.name]));
  const lines = games.map(game => `${names.get(game.away_team_id) || 'Away'} at ${names.get(game.home_team_id) || 'Home'} · ${timeLabel(game.scheduled_at)}`);
  return `🏀 RCL GAMEDAY · NEXT 24 HOURS\n\n${lines.join('\n')}\n\nFollow scores, stats and official results in Game Center.\n\n/games\n\n#RCLGameDay #RichCityLeague`;
}

async function buildRepPost(db: SupabaseClient, clock: Clock) {
  const levelsResult = await db.from('user_levels').select('profile_id,xp,level').order('xp', { ascending: false }).limit(12);
  const levels = (levelsResult.data || []) as LevelRow[];
  const ids = levels.map(row => row.profile_id);
  const profilesResult = ids.length ? await db.from('profiles').select('id,display_name,username,is_system_account').in('id', ids) : null;
  const profiles = (profilesResult?.data || []) as ProfileRow[];
  const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
  const leaders = levels.filter(row => !profileMap.get(row.profile_id)?.is_system_account).slice(0, 3);
  if (!leaders.length) {
    return `⚡ RCL REP · ${clock.dateLabel.toUpperCase()}\n\nThe REP board is open. Earn REP through real activity, participation and contribution across the RCL Network.\n\n/rankings\n\n#RCLREP #RichCityLeague`;
  }
  const lines = leaders.map((row, index) => {
    const profile = profileMap.get(row.profile_id);
    return `${index + 1}. ${profile?.display_name || profile?.username || 'RCL Member'} · ${row.xp} REP · Level ${row.level}`;
  });
  return `⚡ RCL REP LEADERS · ${clock.dateLabel.toUpperCase()}\n\n${lines.join('\n')}\n\nKeep building your basketball reputation through verified activity.\n\n/rankings\n\n#RCLREP #RichCityLeague`;
}

async function buildRunsPost(db: SupabaseClient, clock: Clock) {
  const now = new Date();
  const next72 = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  const runsResult = await db.from('runs')
    .select('title,court_name,location,starts_at')
    .eq('status', 'open')
    .gte('starts_at', now.toISOString())
    .lt('starts_at', next72)
    .order('starts_at', { ascending: true })
    .limit(3);
  const runs = (runsResult.data || []) as RunRow[];
  if (!runs.length) {
    return `🏀 RCL RUNS · ${clock.dateLabel.toUpperCase()}\n\nNo open RCL Runs are currently posted for the next 72 hours. Hosts can create a run and players can watch the board for the next session.\n\n/runs\n\n#RCLRuns #RichmondBasketball`;
  }
  const lines = runs.map(run => `${run.title} · ${run.court_name || run.location} · ${timeLabel(run.starts_at)}`);
  return `🏀 OPEN RUN BOARD · ${clock.dateLabel.toUpperCase()}\n\n${lines.join('\n')}\n\nClaim a spot from the Runs hub.\n\n/runs\n\n#RCLRuns #RichmondBasketball`;
}

async function buildCommunityPost(db: SupabaseClient, clock: Clock) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [members, newMembers] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_system_account', false),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_system_account', false).gte('created_at', since),
  ]);
  return `🤝 RCL COMMUNITY · ${clock.dateLabel.toUpperCase()}\n\n${members.count || 0} active member profiles are part of the Network${newMembers.count ? `, including ${newMembers.count} added in the last 24 hours` : ''}.\n\nFind players, coaches and fans. Join communities. Build real basketball connections.\n\n/explore · /communities\n\n#RCLCommunity #RichCityLeague`;
}

async function buildFantasyPost(db: SupabaseClient, clock: Clock) {
  const teamsResult = await db.from('fantasy_teams')
    .select('name,wins,losses,total_points')
    .order('wins', { ascending: false })
    .order('total_points', { ascending: false })
    .limit(3);
  const teams = (teamsResult.data || []) as FantasyTeamRow[];
  if (!teams.length) {
    return `🏆 RCL FANTASY · ${clock.dateLabel.toUpperCase()}\n\nThe Fantasy hub is ready for league competition. Real RCL player stats power fantasy scoring, matchups and standings.\n\n/fantasy\n\n#RCLFantasy #RichCityLeague`;
  }
  const lines = teams.map((team, index) => `${index + 1}. ${team.name} · ${team.wins}-${team.losses} · ${Number(team.total_points || 0).toFixed(1)} PTS`);
  return `🏆 RCL FANTASY BOARD · ${clock.dateLabel.toUpperCase()}\n\n${lines.join('\n')}\n\nCheck your roster, matchup and standings in the Fantasy hub.\n\n/fantasy\n\n#RCLFantasy #RichCityLeague`;
}

function buildHistoryPost(clock: Clock) {
  const fact = historyFacts[((clock.dayIndex % historyFacts.length) + historyFacts.length) % historyFacts.length];
  return `📚 RCL HISTORY · THROWBACK\n\n${fact}\n\nThe archive connects where RCL started with what the platform is becoming now.\n\n/about · /legacy\n\n#RCLHistory #RichCityLeague`;
}

async function buildBody(db: SupabaseClient, account: OfficialAccount, clock: Clock) {
  if (account === 'rcl') return buildRclPost(db, clock);
  if (account === 'rcl-gameday') return buildGameDayPost(db, clock);
  if (account === 'rcl-rep') return buildRepPost(db, clock);
  if (account === 'rcl-runs') return buildRunsPost(db, clock);
  if (account === 'rcl-community') return buildCommunityPost(db, clock);
  if (account === 'rcl-fantasy') return buildFantasyPost(db, clock);
  return buildHistoryPost(clock);
}

async function publishDaily(db: SupabaseClient, account: OfficialAccount, body: string, dateKey: string) {
  const { data: profile, error: profileError } = await db.from('profiles')
    .select('id')
    .eq('system_account_key', account)
    .eq('is_system_account', true)
    .eq('is_active', true)
    .maybeSingle();
  if (profileError || !profile?.id) return { account, ok: false, error: 'Official system account is unavailable.' };

  const automationType = `daily_${account.replace(/-/g, '_')}`;
  const sourceId = sourceUuid(`${account}|${dateKey}`);
  const { data: existing } = await db.from('posts').select('id')
    .eq('automation_type', automationType)
    .eq('automation_source_id', sourceId)
    .maybeSingle();
  if (existing?.id) return { account, ok: true, duplicate: true, postId: existing.id };

  const { data: post, error } = await db.from('posts').insert({
    author_id: profile.id,
    body,
    media_urls: [],
    status: 'published',
    is_automated: true,
    automation_type: automationType,
    automation_source_id: sourceId,
  }).select('id').single();
  if (error || !post) return { account, ok: false, error: error?.message || 'Unable to publish daily official post.' };
  return { account, ok: true, duplicate: false, postId: post.id };
}

export async function GET(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server database credentials are not configured.' }, { status: 503 });

  const clock = easternClock();
  const accounts = schedule[clock.hour] || [];
  if (!accounts.length) return NextResponse.json({ ok: true, dispatched: [], reason: 'No official account scheduled for this Eastern hour.' });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = [];
  for (const account of accounts) {
    try {
      const body = await buildBody(db, account, clock);
      const result = await publishDaily(db, account, body, clock.dateKey);
      if (result.ok) console.info('[official-daily] published', result);
      else console.error('[official-daily] failed', result);
      results.push(result);
    } catch (error) {
      const failure = { account, ok: false, error: error instanceof Error ? error.message : 'Unknown daily post error.' };
      console.error('[official-daily] failed', failure);
      results.push(failure);
    }
  }

  return NextResponse.json({ ok: results.every(result => result.ok), date: clock.dateKey, dispatched: results });
}
