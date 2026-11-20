import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Container } from '@/components/Container';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const DAYS = 30;
const MAX_RESEND_PAGES = 5;

type PendingMember = {
  id: string;
  email: string;
  createdAt: string;
  confirmationSentAt: string | null;
};
type RecentDelivery = { status: string; createdAt: string };
type ProviderResult = {
  configured: boolean;
  available: boolean;
  checked: number;
  statuses: Map<string, RecentDelivery>;
};

async function requireVerifiedAdmin() {
  const client = await getServerSupabaseClient();
  if (!client) notFound();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || !user.email_confirmed_at) notFound();

  const [{ data: assurance, error: mfaError }, { data: profile, error: profileError }] = await Promise.all([
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
    client.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle(),
  ]);
  if (mfaError || assurance?.currentLevel !== 'aal2' || profileError ||
      profile?.role !== 'admin' || profile?.is_active === false) notFound();
}

async function loadPending() {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error('The server-side administrative Auth connection is unavailable.');

  const members: PendingMember[] = [];
  let scanned = 0;
  let reachedScanLimit = false;
  const cutoff = Date.now() - DAYS * 86400_000;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error('Unable to load pending account verification from Auth.');
    const users: User[] = data.users ?? [];
    scanned += users.length;
    for (const account of users) {
      if (!account.email || account.email_confirmed_at || account.is_anonymous) continue;
      if (Date.parse(account.created_at) < cutoff) continue;
      members.push({
        id: account.id,
        email: account.email,
        createdAt: account.created_at,
        confirmationSentAt: account.confirmation_sent_at ?? null,
      });
    }
    if (users.length < PAGE_SIZE) break;
    if (page === MAX_PAGES) reachedScanLimit = true;
  }
  members.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { members, scanned, reachedScanLimit };
}

async function loadProviderStatuses(members: PendingMember[]): Promise<ProviderResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const statuses = new Map<string, RecentDelivery>();
  if (!key) return { configured: false, available: false, checked: 0, statuses };

  const wanted = new Set(members.map((member) => member.email.trim().toLowerCase()));
  let after: string | undefined;
  let checked = 0;
  try {
    for (let page = 0; page < MAX_RESEND_PAGES; page++) {
      const url = new URL('https://api.resend.com/emails');
      url.searchParams.set('limit', '100');
      if (after) url.searchParams.set('after', after);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Resend status query unavailable');
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) {
        throw new Error('Invalid Resend response');
      }
      const result = body as {
        data: Array<{ id?: string; to?: string[] | string; subject?: string; status?: string; created_at?: string }>;
        has_more?: boolean;
      };
      checked += result.data.length;
      for (const item of result.data) {
        if (item.subject !== 'Confirm your email address' || !item.created_at) continue;
        const recipients = typeof item.to === 'string' ? [item.to] : Array.isArray(item.to) ? item.to : [];
        for (const recipient of recipients) {
          const normalized = recipient.trim().toLowerCase();
          if (!wanted.has(normalized)) continue;
          const previous = statuses.get(normalized);
          if (!previous || item.created_at > previous.createdAt) {
            statuses.set(normalized, { status: item.status ?? 'unknown', createdAt: item.created_at });
          }
        }
      }
      if (!result.has_more || result.data.length === 0) break;
      const lastId = result.data[result.data.length - 1]?.id;
      if (!lastId || lastId === after) break;
      after = lastId;
    }
    return { configured: true, available: true, checked, statuses };
  } catch {
    // Missing/invalid API access must never be mistaken for "not delivered".
    return { configured: true, available: false, checked: 0, statuses: new Map() };
  }
}

function easternDate(value: string | null) {
  if (!value) return 'Not recorded';
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(stamp)) + ' ET';
}

function deliveryLabel(status: string) {
  switch (status) {
    case 'delivered': return 'Delivered to mail server';
    case 'bounced': return 'Bounced';
    case 'suppressed': return 'Suppressed';
    case 'failed': return 'Failed';
    case 'delivery_delayed': return 'Delivery delayed';
    case 'sent': return 'Sent / awaiting delivery';
    case 'queued': return 'Queued';
    default: return 'Provider status: ' + status;
  }
}

export default async function EmailVerificationAdminPage() {
  // Middleware is not enough: API routes bypass it, so always check role and MFA server-side.
  await requireVerifiedAdmin();

  let report: Awaited<ReturnType<typeof loadPending>> | null = null;
  let provider: ProviderResult | null = null;
  let error: string | null = null;
  try {
    report = await loadPending();
    provider = await loadProviderStatuses(report.members);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Verification reporting is temporarily unavailable.';
  }

  const members = report?.members.slice(0, 100) ?? [];

  return <main className="min-h-svh bg-[#060c14] pb-24 text-white">
    <Container maxWidth="xl" className="py-9 sm:py-14">
      <Link href="/admin" className="text-sm font-semibold text-sky-300">← Administration</Link>
      <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Rich City Hoops · Membership operations</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Email verification desk</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-white/70">Review accounts created in the last {DAYS} days that still have an unconfirmed email. A recorded send time and an email provider's “delivered” status are not proof the member saw the message.</p>

      {error && <p role="alert" className="mt-8 rounded-xl border border-amber-300/30 p-5 text-amber-100">{error}</p>}
      {report && provider && <>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#101d2b] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Pending emails</p>
            <p className="mt-2 text-4xl font-black">{report.members.length}{report.reachedScanLimit ? '+' : ''}</p>
            <p className="mt-1 text-xs text-white/50">Last {DAYS} days · {report.scanned} accounts scanned</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101d2b] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Provider connection</p>
            <p className="mt-2 text-lg font-bold">{provider.available ? 'Connected' : provider.configured ? 'Unavailable' : 'Not configured'}</p>
            <p className="mt-1 text-xs text-white/50">{provider.available ? `Recent ${provider.checked} outbound messages checked` : 'Configure a server-only RESEND_API_KEY to check delivery events'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101d2b] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Recovery policy</p>
            <p className="mt-2 text-lg font-bold">Ownership first</p>
            <p className="mt-1 text-xs text-white/50">No automatic confirmation or social DM approval</p>
          </div>
        </div>

        {report.reachedScanLimit && <p className="mt-5 rounded-xl border border-amber-300/30 p-4 text-sm text-amber-100">Account scan limit reached. Counts are a partial minimum, not a complete total.</p>}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-[#101d2b]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/60">
              <tr>
                <th scope="col" className="px-5 py-4">Pending account</th>
                <th scope="col" className="px-5 py-4">Registered</th>
                <th scope="col" className="px-5 py-4">Last confirmation request</th>
                <th scope="col" className="px-5 py-4">Email delivery</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const status = provider.statuses.get(member.email.trim().toLowerCase());
                return <tr key={member.id} className="border-b border-white/10 last:border-0">
                  <td className="px-5 py-4 font-semibold text-white">{member.email}</td>
                  <td className="px-5 py-4 text-white/70">{easternDate(member.createdAt)}</td>
                  <td className="px-5 py-4 text-white/70">{easternDate(member.confirmationSentAt)}</td>
                  <td className="px-5 py-4">
                    <span className={`font-semibold ${status?.status === 'delivered' ? 'text-emerald-300' : status?.status === 'bounced' || status?.status === 'failed' || status?.status === 'suppressed' ? 'text-amber-300' : 'text-white/70'}`}>
                      {!provider.available ? 'Provider status unavailable' : status ? deliveryLabel(status.status) : 'Not found in scanned provider messages'}
                    </span>
                    {status && <div className="mt-1 text-xs text-white/50">{easternDate(status.createdAt)}</div>}
                  </td>
                </tr>;
              })}
              {members.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-white/60">No pending email accounts found in this reporting window.</td></tr>}
            </tbody>
          </table>
        </div>
        {report.members.length > members.length && <p className="mt-3 text-xs text-white/50">Showing the newest 100 pending accounts.</p>}
        <p className="mt-3 text-xs text-white/50">Provider lookup is limited to the most recent 500 emails. “Not found” does not mean no message was sent. The delivery status is the provider's latest recorded event, not inbox placement.</p>}
      </>}

      <section className="mt-10 rounded-2xl border border-white/10 bg-[#101d2b] p-6">
        <h2 className="text-xl font-black">Recovery and support procedure</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-white/75">
          <li>Confirm the exact account address and delivery status; have the member search All Mail for <strong className="text-white">notifications@mail.richcityhoops.com</strong>. Avoid repeated resends during a rate limit.</li>
          <li>When the mailbox stays unreachable, direct the member to <a className="font-semibold text-sky-300 underline" href="mailto:info@richcityhoops.com?subject=RCH%20email%20verification%20support">RCH support</a> for an independently reviewed account recovery request. Do not ask for passwords, login codes or private verification links.</li>
          <li>Do not set email-confirmed status based on a social DM, a screenshot or knowledge of the account password. If ownership is established using a trusted independent process, arrange a reachable replacement email and require confirmation of that new mailbox using the standard verification flow.</li>
          <li>Record the review and actions in the existing support/audit process. This dashboard deliberately has no one-click bypass.</li>
        </ol>
      </section>
    </Container>
  </main>;
}
