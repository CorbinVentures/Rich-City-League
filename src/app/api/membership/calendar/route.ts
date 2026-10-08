import { getServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CalendarItem = { uid: string; title: string; start: string; end?: string | null; location?: string | null; description?: string | null; url?: string | null };

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function addHours(value: string, hours = 2) {
  return new Date(new Date(value).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return new Response('Membership authentication is unavailable.', { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Sign in to export your RCL calendar.', { status: 401 });
  const db = supabase as any;
  const { data: entitled } = await db.rpc('member_has_entitlement', { entitlement_key: 'calendar_export' });
  if (entitled !== true) return new Response('RCL+ or All Access is required for calendar export.', { status: 403 });

  const now = new Date().toISOString();
  const [{ data: savedRows }, { data: preferences }] = await Promise.all([
    db.from('member_saved_items').select('item_type,item_id').eq('user_id', user.id),
    db.from('member_opportunity_preferences').select('regions,event_types,run_skill_levels').eq('user_id', user.id).maybeSingle(),
  ]);
  const saved = (savedRows ?? []) as Array<{ item_type: string; item_id: string }>;
  const items: CalendarItem[] = [];
  const keys = new Set<string>();
  const push = (item: CalendarItem) => { if (!keys.has(item.uid)) { keys.add(item.uid); items.push(item); } };

  const savedEventIds = saved.filter((row) => row.item_type === 'network_event').map((row) => row.item_id);
  const savedRunIds = saved.filter((row) => row.item_type === 'run').map((row) => row.item_id);
  const savedGameIds = saved.filter((row) => row.item_type === 'game').map((row) => row.item_id);

  if (savedEventIds.length) {
    const { data } = await db.from('network_events').select('id,title,description,venue_name,city,state,starts_at,ends_at,slug').in('id', savedEventIds).gte('starts_at', now).eq('status', 'published');
    for (const row of data ?? []) push({ uid: `network-event-${row.id}@richcityhoops.com`, title: row.title, start: row.starts_at, end: row.ends_at || addHours(row.starts_at), location: [row.venue_name,row.city,row.state].filter(Boolean).join(', '), description: row.description, url: `https://richcityhoops.com/network/events/${row.slug}` });
  }
  if (savedRunIds.length) {
    const { data } = await db.from('runs').select('id,title,description,court_name,location,starts_at').in('id', savedRunIds).gte('starts_at', now).neq('status', 'cancelled');
    for (const row of data ?? []) push({ uid: `run-${row.id}@richcityhoops.com`, title: row.title, start: row.starts_at, end: addHours(row.starts_at), location: row.court_name || row.location, description: row.description, url: 'https://richcityhoops.com/runs' });
  }
  if (savedGameIds.length) {
    const { data } = await db.from('games').select('id,scheduled_at,home:teams!games_home_team_id_fkey(name),away:teams!games_away_team_id_fkey(name)').in('id', savedGameIds).gte('scheduled_at', now);
    for (const row of data ?? []) push({ uid: `game-${row.id}@richcityhoops.com`, title: `${row.away?.name || 'Away'} vs ${row.home?.name || 'Home'}`, start: row.scheduled_at, end: addHours(row.scheduled_at), description: 'Rich City League game', url: `https://richcityhoops.com/games/${row.id}` });
  }

  const regions: string[] = preferences?.regions?.length ? preferences.regions : ['central-virginia'];
  const eventTypes: string[] = preferences?.event_types ?? [];
  const { data: orgRows } = await db.from('network_organizations').select('id').in('region', regions).eq('status', 'active');
  const orgIds = (orgRows ?? []).map((row: any) => row.id);
  if (orgIds.length) {
    let query = db.from('network_events').select('id,title,description,event_type,venue_name,city,state,starts_at,ends_at,slug').in('organization_id', orgIds).gte('starts_at', now).eq('status', 'published').order('starts_at').limit(20);
    if (eventTypes.length) query = query.in('event_type', eventTypes);
    const { data } = await query;
    for (const row of data ?? []) push({ uid: `network-event-${row.id}@richcityhoops.com`, title: row.title, start: row.starts_at, end: row.ends_at || addHours(row.starts_at), location: [row.venue_name,row.city,row.state].filter(Boolean).join(', '), description: row.description, url: `https://richcityhoops.com/network/events/${row.slug}` });
  }

  const runSkills: string[] = preferences?.run_skill_levels ?? [];
  let runsQuery = db.from('runs').select('id,title,description,court_name,location,starts_at,skill_level').gte('starts_at', now).neq('status', 'cancelled').order('starts_at').limit(10);
  if (runSkills.length) runsQuery = runsQuery.in('skill_level', runSkills);
  const { data: upcomingRuns } = await runsQuery;
  for (const row of upcomingRuns ?? []) push({ uid: `run-${row.id}@richcityhoops.com`, title: row.title, start: row.starts_at, end: addHours(row.starts_at), location: row.court_name || row.location, description: row.description, url: 'https://richcityhoops.com/runs' });

  items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Rich City League//My Hoops//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:RCL My Hoops'];
  for (const item of items) {
    lines.push('BEGIN:VEVENT', `UID:${escapeIcs(item.uid)}`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(item.start)}`, `DTEND:${icsDate(item.end || addHours(item.start))}`, `SUMMARY:${escapeIcs(item.title)}`);
    if (item.location) lines.push(`LOCATION:${escapeIcs(item.location)}`);
    if (item.description) lines.push(`DESCRIPTION:${escapeIcs(item.description)}`);
    if (item.url) lines.push(`URL:${escapeIcs(item.url)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rcl-my-hoops.ics"',
      'Cache-Control': 'private, no-store',
    },
  });
}
