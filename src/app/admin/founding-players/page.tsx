import Link from 'next/link';
import { getServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Founding Player Command | Rich City Hoops', robots: { index: false, follow: false } };

const workflows = [
  ['01', 'Founding player outreach', 'Draft invitation → review previous contact → log actual send'],
  ['02', 'QR / profile onboarding', 'Share registration QR → confirm account → complete profile'],
  ['03', 'First Runs participation', 'Find a Run → RSVP → verify actual check-in'],
  ['04', 'Highlight submission', 'Upload a clip → verify rights → editorial review'],
  ['05', 'Between the Lines casting', 'Identify candidate → interview → consent → production decision'],
  ['06', 'League tryout transition', 'Record interest → confirm eligibility → register for tryouts'],
];

export default async function FoundingPlayerCommandPage() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return <main className="mx-auto max-w-4xl p-8">Service temporarily unavailable.</main>;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <main className="mx-auto max-w-4xl p-8"><h1>Staff sign-in required</h1><Link href="/login">Sign in</Link></main>;

  const { data: staff } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (staff?.role !== 'admin') return <main className="mx-auto max-w-4xl p-8"><h1>Restricted staff workspace</h1><p>Only authorized administrators may view this dashboard.</p></main>;

  const [profilesResult, checkinsResult, highlightsResult, tryoutsResult] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, first_name, last_name, location, position, onboarding_complete, is_active, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('run_checkins').select('profile_id, run_id').limit(5000),
    supabase.from('player_highlights').select('id, uploaded_by, status').limit(5000),
    supabase.from('tryout_registrations').select('id').limit(5000),
  ]);
  const error = [profilesResult, checkinsResult, highlightsResult, tryoutsResult].find(r => r.error)?.error;
  if (error) return <main className="mx-auto max-w-4xl p-8"><h1>Dashboard unavailable</h1><p>One or more live sources could not be loaded. No figures are shown to avoid misleading totals.</p></main>;

  const profiles = profilesResult.data ?? [];
  const checkins = checkinsResult.data ?? [];
  const highlights = highlightsResult.data ?? [];
  const tryouts = tryoutsResult.data ?? [];
  const runParticipants = new Set(checkins.map(c => c.profile_id));
  const highlightCreators = new Set(highlights.map(h => h.uploaded_by).filter(Boolean));
  const cards = [
    ['Registered profiles', profiles.length],
    ['Active accounts', profiles.filter(p => p.is_active).length],
    ['Verified Runs participants', runParticipants.size],
    ['Submitted highlights', highlights.length],
    ['Highlight contributors', highlightCreators.size],
    ['Tryout registrations', tryouts.length],
  ];

  return <main className="min-h-screen bg-[#0b0b0d] text-white">
    <div className="mx-auto max-w-7xl px-5 py-10">
      <p className="text-xs font-bold tracking-[.35em] text-zinc-400">RICH CITY HOOPS / PRIVATE OPERATIONS</p>
      <h1 className="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">Founding Player Command</h1>
      <p className="mt-3 max-w-3xl text-zinc-300">Recruit → register → activate through Runs → capture highlights → cast stories → advance toward Rich City League tryouts.</p>
      <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">Live read-only view. These are platform-wide indicators, not founding-player cohort totals. Draft outreach, casting approvals and follow-ups remain separate until an authorized staff workflow is implemented. Nothing is sent or published from this page.</div>
      <section aria-label="Live platform indicators" className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([label, count]) => <div key={String(label)} className="rounded-xl border border-zinc-700 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-2 text-3xl font-black">{count}</p></div>)}
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-bold uppercase">Registered player directory</h2>
        <p className="mt-2 text-sm text-zinc-400">Existing profiles only. No player is automatically labeled a founding player or league prospect.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-700">
          <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-zinc-800 text-zinc-200"><tr><th className="p-3">Player</th><th className="p-3">City</th><th className="p-3">Position</th><th className="p-3">Profile</th><th className="p-3">Runs check-in</th></tr></thead><tbody>{profiles.map(p => <tr key={p.id} className="border-t border-zinc-800"><td className="p-3">{p.display_name || [p.first_name,p.last_name].filter(Boolean).join(' ') || p.username || 'Unnamed account'}</td><td className="p-3">{p.location || '—'}</td><td className="p-3">{p.position || '—'}</td><td className="p-3">{p.onboarding_complete ? 'Completed' : 'Incomplete'}</td><td className="p-3">{runParticipants.has(p.id) ? 'Verified' : 'Not verified'}</td></tr>)}</tbody></table>
        </div>
      </section>
      <section className="mt-10"><h2 className="text-xl font-bold uppercase">Activation playbooks</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{workflows.map(([number,title,detail]) => <div key={number} className="rounded-xl border border-zinc-700 bg-zinc-900 p-5"><p className="text-xs text-zinc-400">{number} / WORKFLOW</p><h3 className="mt-2 font-bold">{title}</h3><p className="mt-2 text-sm text-zinc-400">{detail}</p></div>)}</div></section>
      <p className="mt-10 text-xs text-zinc-500">Data is capped at 500 profiles and 5,000 related records per source. Figures are partial if those limits are reached. Runs participation counts verified check-ins, not RSVPs. Highlight submissions are not necessarily approved or published.</p>
    </div>
  </main>;
}
