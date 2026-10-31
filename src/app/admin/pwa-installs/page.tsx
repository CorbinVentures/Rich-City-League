import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Container } from '@/components/Container';
import { RchPwaAdoptionDashboard } from '@/components/admin/RchPwaAdoptionDashboard';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import type { MobilePwaPlatform, PwaAdoptionMember } from '@/lib/pwa-adoption';

export const dynamic = 'force-dynamic';

type RawInstallation = {
  profile_id: string;
  platform: MobilePwaPlatform;
  first_seen_at: string;
  last_seen_at: string;
  launch_count: number;
  profile: {
    display_name: string | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    is_system_account: boolean | null;
  } | null;
};

const PAGE_SIZE = 500;
const MAX_ROWS = 5000;

async function authorizedAdmin() {
  const auth = await getServerSupabaseClient();
  if (!auth) return false;
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/member-access');
  const [{ data: assurance }, { data: profile }] = await Promise.all([
    auth.auth.mfa.getAuthenticatorAssuranceLevel(),
    auth.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle(),
  ]);
  return profile?.role === 'admin' && profile?.is_active !== false &&
    assurance?.currentLevel === 'aal2';
}

async function loadObservedMembers() {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error('Administrative database is unavailable.');
  const rows: RawInstallation[] = [];
  for (let start = 0; start < MAX_ROWS; start += PAGE_SIZE) {
    const { data, error } = await db.from('rch_pwa_installations')
      .select('profile_id,platform,first_seen_at,last_seen_at,launch_count,profile:profiles!rch_pwa_installations_profile_id_fkey(display_name,username,first_name,last_name,is_system_account)')
      .order('last_seen_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error('PWA observations are not available. Check that the database migration has run.');
    const page = (data ?? []) as unknown as RawInstallation[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    if (start + PAGE_SIZE >= MAX_ROWS) throw new Error('The PWA observation limit was reached. Increase pagination before showing totals.');
  }

  const byMember = new Map<string, PwaAdoptionMember>();
  for (const row of rows) {
    if (!row.profile || row.profile.is_system_account === true) continue;
    const existing = byMember.get(row.profile_id);
    const name = row.profile.display_name?.trim() ||
      [row.profile.first_name, row.profile.last_name].filter(Boolean).join(' ').trim() ||
      row.profile.username || 'Unnamed member';
    if (!existing) {
      byMember.set(row.profile_id, {
        profileId: row.profile_id,
        name,
        username: row.profile.username,
        platforms: [row.platform],
        deviceCount: 1,
        launches: row.launch_count,
        firstSeen: row.first_seen_at,
        lastSeen: row.last_seen_at,
      });
      continue;
    }
    if (!existing.platforms.includes(row.platform)) existing.platforms.push(row.platform);
    existing.deviceCount++;
    existing.launches += row.launch_count;
    if (row.first_seen_at < existing.firstSeen) existing.firstSeen = row.first_seen_at;
    if (row.last_seen_at > existing.lastSeen) existing.lastSeen = row.last_seen_at;
  }
  return [...byMember.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

export default async function PwaInstallsAdminPage() {
  // Defense in depth: middleware handles session, role and MFA before render.
  if (!await authorizedAdmin()) notFound();

  let members: PwaAdoptionMember[] = [];
  let error: string | null = null;
  try { members = await loadObservedMembers(); }
  catch (caught) { error = caught instanceof Error ? caught.message : 'Unable to load PWA launch data.'; }

  return <main className="min-h-svh bg-[#060c14] pb-24 text-white">
    <Container maxWidth="xl" className="py-9 sm:py-14">
      <Link href="/admin/growth" className="text-sm font-semibold text-sky-300">← Member Growth Center</Link>
      <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-rose-400">Rich City Hoops · Member technology</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">PWA adoption</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">See which signed-in members have launched Rich City Hoops from the installed iPhone, iPad or Android app. These are observed standalone launches, not an exact operating-system install count. Tracking begins after this release; historical installs will appear only when opened again.</p>
      {error
        ? <p role="alert" className="mt-7 rounded-xl border border-amber-300/30 p-5 text-amber-100">{error}</p>
        : <div className="mt-8"><RchPwaAdoptionDashboard members={members} generatedAt={new Date().toISOString()} /></div>}
    </Container>
  </main>;
}