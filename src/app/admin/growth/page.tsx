import Link from 'next/link';
import { Container } from '@/components/Container';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type EventRow = {
  session_id: string;
  event_type: string;
  context: string;
  created_at: string;
};

const ORDER = [
  ['home_view', 'Homepage viewed (anonymous tab sessions)'],
  ['join_click', 'Join Free clicked'],
  ['signup_view', 'Registration viewed'],
  ['signup_account_continue', 'Account details continued'],
  ['signup_role_continue', 'Role selected'],
  ['signup_submitted', 'Registration submitted'],
  ['signup_created', 'Email account created'],
  ['first_action_click', 'Welcome action clicked'],
  ['signup_failed', 'Registration failure'],
] as const;

export default async function GrowthCenter() {
  // /admin routes are protected by session, admin role and MFA middleware.
  // Only aggregate values are displayed. Random tab-session UUIDs stay server-side.
  const db = getSupabaseAdminClient() as any;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = db
    ? await db.from('rch_conversion_events')
      .select('session_id,event_type,context,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10000)
    : { data: [], error: { message: 'Server analytics access is not configured.' } };
  const events = (data ?? []) as EventRow[];
  const counts = new Map<string, Set<string>>();
  const sources = new Map<string, Set<string>>();
  for (const event of events) {
    const key = event.event_type;
    if (!counts.has(key)) counts.set(key, new Set());
    counts.get(key)!.add(event.session_id);
    if (key === 'join_click') {
      if (!sources.has(event.context)) sources.set(event.context, new Set());
      sources.get(event.context)!.add(event.session_id);
    }
  }
  const sourceCounts = [...sources.entries()]
    .map(([name, sessions]) => ({ name, count: sessions.size }))
    .sort((a, b) => b.count - a.count);
  return <main className="min-h-svh bg-[#060c14] pb-24 text-white">
    <Container maxWidth="xl" className="py-10 sm:py-16">
      <Link href="/admin" className="text-sm text-sky-300">← Admin</Link>
      <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-rose-400">Rich City Hoops · Acquisition</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Member Growth Center</h1>
      <Link href="/admin/quality" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-rose-300 underline underline-offset-4">Open the 16-category business psychology quality gate</Link>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">Last seven days. Each count is deduplicated by anonymous browser-tab session, not by real people. Consent and privacy opt-outs are respected. Homepage views and clicks are anonymous tab-session measures, not visitor identities. Welcome clicks are not proof of Run attendance or day-seven retention. OAuth completions and verified account activations require separate measurement.</p>
      {error && <div role="status" className="mt-6 rounded-xl border border-amber-300/30 p-4 text-sm text-amber-100">Conversion telemetry is currently unavailable. The database connection or event permissions need review.</div>}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.slice(0,4).map(([key, label]) => <div key={key} className="rounded-2xl border border-white/15 bg-white/[.04] p-5">
          <p className="text-xs uppercase tracking-wide text-white/55">{label}</p>
          <p className="mt-3 font-display text-4xl font-black">{counts.get(key)?.size ?? 0}</p>
        </div>)}
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/15 bg-white/[.035] p-6">
          <h2 className="text-2xl font-black">Registration funnel</h2>
          <div className="mt-5 space-y-3">
            {ORDER.map(([key, label]) => <div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-3 text-sm"><span className="text-white/70">{label}</span><strong>{counts.get(key)?.size ?? 0}</strong></div>)}
          </div>
        </article>
        <article className="rounded-2xl border border-white/15 bg-white/[.035] p-6">
          <h2 className="text-2xl font-black">Where members enter</h2>
          {sourceCounts.length ? <div className="mt-5 space-y-3">{sourceCounts.map(item => <div key={item.name} className="flex justify-between gap-3 border-b border-white/10 pb-3 text-sm"><span className="capitalize text-white/70">{item.name.replace(/_/g, ' ')}</span><strong>{item.count}</strong></div>)}</div>
          : <p className="mt-5 text-sm text-white/60">No measured join clicks in this period.</p>}
        </article>
      </section>
      <p className="mt-6 max-w-3xl text-xs leading-6 text-white/50">These measures show registration flow friction, not signup conversion percentages, unique visitors, active users, or verified Run attendance. Compare them with actual profile creation and activity metrics before taking budget decisions.</p>
    </Container>
  </main>;
}
