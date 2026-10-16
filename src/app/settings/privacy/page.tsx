'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaBan, FaComments, FaFileShield, FaLock, FaPen, FaTrash, FaUserGroup, FaUserShield } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type ProfileVisibility = 'public' | 'friends' | 'private';
type FriendPolicy = 'everyone' | 'friends_of_friends' | 'nobody';
type MessagePolicy = 'everyone' | 'friends' | 'nobody';
type BlockedAccount = { blocked_id: string; created_at: string; label: string };
type RequestStatus = { id: string; request_type: string; status: string; created_at: string };

const kinds = [
  { key:'access', label:'Access my data', body:'Request a copy of personal data associated with your authenticated RCL account.', icon:FaFileShield },
  { key:'correct', label:'Correct my data', body:'Ask RCL to review and correct personal information you believe is inaccurate.', icon:FaPen },
  { key:'delete', label:'Delete my data/account', body:'Request deletion of your account and eligible personal data, subject to legal and operational requirements.', icon:FaTrash },
  { key:'appeal', label:'Appeal a privacy decision', body:'Request review of a prior privacy decision or response.', icon:FaUserShield },
] as const;

export default function PrivacyCenter() {
  const { user, loading: authLoading } = useAuth();
  const db = useMemo(() => getSupabaseClient(), []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [messagePolicy, setMessagePolicy] = useState<MessagePolicy>('everyone');
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');
  const [friendPolicy, setFriendPolicy] = useState<FriendPolicy>('everyone');
  const [blocked, setBlocked] = useState<BlockedAccount[]>([]);
  const [requests, setRequests] = useState<RequestStatus[]>([]);
  const [policyLoading, setPolicyLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setMessagePolicy('everyone');
      setVisibility('public');
      setFriendPolicy('everyone');
      setBlocked([]);
      setRequests([]);
      setPolicyLoading(false);
      return;
    }
    let active = true;
    setPolicyLoading(true);
    setMessage('');
    const load = async () => {
      const [settingsResult, blocksResult, requestsResult] = await Promise.all([
        (db as any).from('profiles').select('message_policy,profile_visibility,friend_request_policy').eq('id', user.id).maybeSingle(),
        (db as any).rpc('get_my_blocked_accounts'),
        (db as any).from('privacy_requests').select('id,request_type,status,created_at').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      if (!active) return;
      const profile = settingsResult.data;
      if (profile?.message_policy && ['everyone','friends','nobody'].includes(profile.message_policy)) setMessagePolicy(profile.message_policy);
      if (profile?.profile_visibility && ['public','friends','private'].includes(profile.profile_visibility)) setVisibility(profile.profile_visibility);
      if (profile?.friend_request_policy && ['everyone','friends_of_friends','nobody'].includes(profile.friend_request_policy)) setFriendPolicy(profile.friend_request_policy);
      if (requestsResult.data) setRequests(requestsResult.data as RequestStatus[]);
      setBlocked((blocksResult.data ?? []) as BlockedAccount[]);
      const failure = settingsResult.error || blocksResult.error || requestsResult.error;
      if (failure) setMessage(failure.message || 'Some privacy information could not be loaded.');
      setPolicyLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [db, user?.id]);

  async function savePreference(
    field: 'message_policy' | 'profile_visibility' | 'friend_request_policy',
    value: MessagePolicy | ProfileVisibility | FriendPolicy,
  ) {
    if (!db || !user || busy || policyLoading) return;
    setBusy(field);
    setMessage('');
    const { error } = await (db as any).from('profiles').update({ [field]: value }).eq('id', user.id);
    if (error) {
      setMessage(error.message || 'Unable to save your privacy preference.');
    } else {
      if (field === 'message_policy') setMessagePolicy(value as MessagePolicy);
      if (field === 'profile_visibility') setVisibility(value as ProfileVisibility);
      if (field === 'friend_request_policy') setFriendPolicy(value as FriendPolicy);
      setMessage('Privacy preference saved.');
    }
    setBusy(null);
  }

  async function unblockAccount(id: string) {
    if (!db || !user || busy) return;
    setBusy('unblock');
    setMessage('');
    const { error } = await (db as any).from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', id);
    if (error) setMessage(error.message || 'Unable to unblock this member.');
    else {
      setBlocked(current => current.filter(account => account.blocked_id !== id));
      setMessage('Member unblocked. They can interact with you according to your current privacy preferences.');
    }
    setBusy(null);
  }

  async function submit(kind: string) {
    if (!db || !user || busy) return;
    setBusy(kind); setMessage('');
    const { error } = await (db as any).rpc('create_privacy_request', { kind, request_details: null });
    setMessage(error ? error.message : 'Request submitted. RCH staff can now review your request.');
    if (!error) {
      const { data } = await (db as any).from('privacy_requests').select('id,request_type,status,created_at').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (data) setRequests(data as RequestStatus[]);
    }
    setBusy(null);
  }

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero eyebrow="Account Control" title="Privacy Center" accent="Your data, your rights" description="Review RCL privacy information and submit authenticated access, correction, deletion, or appeal requests from one place." meta={<span className="grid h-14 w-14 place-items-center rounded-2xl border border-rcl-blue/20 bg-rcl-blue/10 text-2xl text-rcl-blue"><FaLock/></span>} />
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/settings" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/35 transition hover:text-white"><FaArrowLeft/> Settings</Link><Link href="/legal/privacy" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/5 px-4 text-xs font-black uppercase tracking-wider text-rcl-blue transition hover:border-rcl-blue/50">Read Privacy Policy <FaArrowRight/></Link></div>

      {authLoading ? <div className="h-48 animate-pulse rounded-2xl border border-rcl-blue/10 bg-white/[.025]"/> : user ? <section>
        <section className="mb-8 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-6" aria-labelledby="profile-privacy-title">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaUserShield/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Profile privacy</p><h2 id="profile-privacy-title" className="mt-1 font-display text-2xl font-black uppercase">Who can view your profile?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Protect your social page and posts, without removing official public league statistics or published event records.</p></div></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {([
              ['public','Public','Anyone can view your social profile.'],
              ['friends','Connections','Only signed-in, accepted connections can view it.'],
              ['private','Only me','Hide your social profile from other members.'],
            ] as const).map(([value,label,detail]) => <button key={value} type="button" disabled={policyLoading || Boolean(busy)} aria-pressed={visibility === value} onClick={() => void savePreference('profile_visibility', value)} className={'rounded-2xl border p-4 text-left transition disabled:opacity-50 ' + (visibility === value ? 'border-rcl-blue/50 bg-rcl-blue/10' : 'border-white/10 bg-black/10 hover:border-rcl-blue/30')}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-white/45">{detail}</span></button>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-white/45">This limits social-profile access, not copies or screenshots people previously saved, your messages to others, or official league data.</p>
        </section>

        <section className="mb-8 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-6" aria-labelledby="friend-privacy-title">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaUserGroup/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Connections</p><h2 id="friend-privacy-title" className="mt-1 font-display text-2xl font-black uppercase">Who can send requests?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Control new connection invitations. Existing connections do not change.</p></div></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {([
              ['everyone','Everyone','Any active member can invite you.'],
              ['friends_of_friends','Mutual connections','Only people with a shared accepted connection.'],
              ['nobody','Nobody','Do not accept new connection requests.'],
            ] as const).map(([value,label,detail]) => <button key={value} type="button" disabled={policyLoading || Boolean(busy)} aria-pressed={friendPolicy === value} onClick={() => void savePreference('friend_request_policy', value)} className={'rounded-2xl border p-4 text-left transition disabled:opacity-50 ' + (friendPolicy === value ? 'border-rcl-blue/50 bg-rcl-blue/10' : 'border-white/10 bg-black/10 hover:border-rcl-blue/30')}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-white/45">{detail}</span></button>)}
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-6" aria-labelledby="messaging-privacy-title">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaComments/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Messaging privacy</p><h2 id="messaging-privacy-title" className="mt-1 font-display text-2xl font-black uppercase">Who can direct message you?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">This applies to starting and continuing one-to-one conversations. Blocking someone always overrides this setting.</p></div></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {([
              ['everyone','Everyone','Any active RCH member can message you.'],
              ['friends','Connections','Only accepted basketball connections can message you.'],
              ['nobody','Nobody','Pause incoming one-to-one messages.'],
            ] as const).map(([value,label,detail]) => <button key={value} type="button" disabled={policyLoading || Boolean(busy)} aria-pressed={messagePolicy === value} onClick={() => void savePreference('message_policy', value)} className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${messagePolicy === value ? 'border-rcl-blue/50 bg-rcl-blue/10' : 'border-white/10 bg-black/10 hover:border-rcl-blue/30'}`}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-white/35">{detail}</span></button>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/30">Message notification delivery is controlled separately.</p><div className="flex gap-3"><Link href="/settings/notifications" className="text-xs font-black uppercase tracking-wider text-rcl-blue">Notification settings</Link><Link href="/legal/safety" className="text-xs font-black uppercase tracking-wider text-rcl-blue">Safety Center</Link></div></div>
        </section>

        <section className="mb-8 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-6" aria-labelledby="blocked-accounts-title">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-400/10 text-red-300"><FaBan/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Safety controls</p><h2 id="blocked-accounts-title" className="mt-1 font-display text-2xl font-black uppercase">Blocked accounts</h2><p className="mt-2 text-sm leading-6 text-white/50">Manage members you have blocked. Unblocking does not automatically reconnect or follow anyone.</p></div></div>
          {policyLoading ? <p className="mt-5 text-sm text-white/40">Loading blocked accounts…</p> : blocked.length ? <div className="mt-5 space-y-2">{blocked.map(account => <div key={account.blocked_id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><p className="min-w-0 truncate text-sm font-bold">{account.label}</p><button type="button" disabled={Boolean(busy)} onClick={() => void unblockAccount(account.blocked_id)} className="min-h-10 shrink-0 rounded-lg border border-rcl-blue/25 px-3 text-xs font-black uppercase tracking-wider text-rcl-blue disabled:opacity-50">Unblock</button></div>)}</div> : <p className="mt-5 text-sm text-white/45">You have no blocked accounts.</p>}
          <Link href="/legal/safety" className="mt-4 inline-flex min-h-10 items-center text-xs font-black uppercase tracking-wider text-rcl-blue">Reporting and Safety Center <FaArrowRight className="ml-2"/></Link>
        </section>

        <div className="mb-5"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Authenticated requests</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Choose a privacy action</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Your identity is tied to the signed-in account. RCL staff may request additional verification when reasonably necessary.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{kinds.map(({key,label,body,icon:Icon}) => <button key={key} type="button" disabled={Boolean(busy)} onClick={() => void submit(key)} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 text-left transition hover:-translate-y-1 hover:border-rcl-blue/45 disabled:opacity-50"><div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${key === 'delete' ? 'bg-red-400/10 text-red-300' : 'bg-rcl-blue/10 text-rcl-blue'}`}><Icon/></span><FaArrowRight className="mt-1 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/></div><h3 className="mt-6 font-display text-xl font-black uppercase group-hover:text-rcl-blue">{label}</h3><p className="mt-2 text-sm leading-6 text-white/40">{body}</p><p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-rcl-orange">{busy === key ? 'Submitting…' : 'Submit request'}</p></button>)}</div>
        {requests.length > 0 && <section className="mt-8 rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5" aria-label="Recent privacy requests"><h3 className="font-display text-xl font-black uppercase">Request history</h3><div className="mt-4 space-y-3">{requests.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm"><span className="capitalize text-white/75">{request.request_type} request</span><span className="text-white/45">{request.status} · {new Date(request.created_at).toLocaleDateString()}</span></div>)}</div></section>}
        {message && <p role="status" className={'mt-5 rounded-xl border px-4 py-3 text-sm ' + (message.startsWith('Request submitted') || message.startsWith('Privacy preference saved') || message.startsWith('Member unblocked') ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300' : 'border-red-400/20 bg-red-400/5 text-red-300')}>{message}</p>}
      </section> : <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-10 text-center"><FaUserShield className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Sign in to submit a request</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/40">Privacy requests must be tied to an authenticated RCL identity.</p><Link href="/auth/sign-in?next=/settings/privacy" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link></div>}
    </Container>
  </main>;
}
