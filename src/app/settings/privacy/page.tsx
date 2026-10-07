'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaComments, FaFileShield, FaLock, FaPen, FaTrash, FaUserShield } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

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
  const [messagePolicy, setMessagePolicy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [policyLoading, setPolicyLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setPolicyLoading(false);
      return;
    }
    let active = true;
    void (db as any).from('profiles').select('message_policy').eq('id', user.id).maybeSingle().then(({ data, error }: { data?: { message_policy?: string } | null; error?: { message?: string } | null }) => {
      if (!active) return;
      if (error) setMessage(error.message || 'Unable to load messaging privacy.');
      if (data?.message_policy && ['everyone','friends','nobody'].includes(data.message_policy)) {
        setMessagePolicy(data.message_policy as 'everyone' | 'friends' | 'nobody');
      }
      setPolicyLoading(false);
    });
    return () => { active = false; };
  }, [db, user]);

  async function saveMessagePolicy(value: 'everyone' | 'friends' | 'nobody') {
    if (!db || !user || busy) return;
    const previous = messagePolicy;
    setMessagePolicy(value);
    setBusy('message-policy');
    setMessage('');
    const { error } = await (db as any).from('profiles').update({ message_policy: value }).eq('id', user.id);
    if (error) {
      setMessagePolicy(previous);
      setMessage(error.message || 'Unable to save messaging privacy.');
    } else {
      setMessage('Messaging privacy saved.');
    }
    setBusy(null);
  }

  async function submit(kind: string) {
    if (!db || !user || busy) return;
    setBusy(kind); setMessage('');
    const { error } = await (db as any).rpc('create_privacy_request', { kind, request_details: null });
    setMessage(error ? error.message : 'Request submitted. RCL staff can now authenticate, process, and document this request.');
    setBusy(null);
  }

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero eyebrow="Account Control" title="Privacy Center" accent="Your data, your rights" description="Review RCL privacy information and submit authenticated access, correction, deletion, or appeal requests from one place." meta={<span className="grid h-14 w-14 place-items-center rounded-2xl border border-rcl-blue/20 bg-rcl-blue/10 text-2xl text-rcl-blue"><FaLock/></span>} />
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/settings" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/35 transition hover:text-white"><FaArrowLeft/> Settings</Link><Link href="/legal/privacy" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/5 px-4 text-xs font-black uppercase tracking-wider text-rcl-blue transition hover:border-rcl-blue/50">Read Privacy Policy <FaArrowRight/></Link></div>

      {authLoading ? <div className="h-48 animate-pulse rounded-2xl border border-rcl-blue/10 bg-white/[.025]"/> : user ? <section>
        <section className="mb-8 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-6" aria-labelledby="messaging-privacy-title">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaComments/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Messaging privacy</p><h2 id="messaging-privacy-title" className="mt-1 font-display text-2xl font-black uppercase">Who can direct message you?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">This applies to starting and continuing one-to-one conversations. Blocking someone always overrides this setting.</p></div></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {([
              ['everyone','Everyone','Any active RCH member can message you.'],
              ['friends','Connections','Only accepted basketball connections can message you.'],
              ['nobody','Nobody','Pause incoming one-to-one messages.'],
            ] as const).map(([value,label,detail]) => <button key={value} type="button" disabled={policyLoading || busy === 'message-policy'} aria-pressed={messagePolicy === value} onClick={() => void saveMessagePolicy(value)} className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${messagePolicy === value ? 'border-rcl-blue/50 bg-rcl-blue/10' : 'border-white/10 bg-black/10 hover:border-rcl-blue/30'}`}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-white/35">{detail}</span></button>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/30">Message notification delivery is controlled separately.</p><div className="flex gap-3"><Link href="/settings/notifications" className="text-xs font-black uppercase tracking-wider text-rcl-blue">Notification settings</Link><Link href="/legal/safety" className="text-xs font-black uppercase tracking-wider text-rcl-blue">Safety Center</Link></div></div>
        </section>

        <div className="mb-5"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Authenticated requests</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Choose a privacy action</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Your identity is tied to the signed-in account. RCL staff may request additional verification when reasonably necessary.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{kinds.map(({key,label,body,icon:Icon}) => <button key={key} type="button" disabled={Boolean(busy)} onClick={() => void submit(key)} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 text-left transition hover:-translate-y-1 hover:border-rcl-blue/45 disabled:opacity-50"><div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${key === 'delete' ? 'bg-red-400/10 text-red-300' : 'bg-rcl-blue/10 text-rcl-blue'}`}><Icon/></span><FaArrowRight className="mt-1 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/></div><h3 className="mt-6 font-display text-xl font-black uppercase group-hover:text-rcl-blue">{label}</h3><p className="mt-2 text-sm leading-6 text-white/40">{body}</p><p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-rcl-orange">{busy === key ? 'Submitting…' : 'Submit request'}</p></button>)}</div>
        {message && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${message.startsWith('Request submitted') || message === 'Messaging privacy saved.' ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300' : 'border-red-400/20 bg-red-400/5 text-red-300'}`}>{message}</p>}
      </section> : <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-10 text-center"><FaUserShield className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Sign in to submit a request</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/40">Privacy requests must be tied to an authenticated RCL identity.</p><Link href="/auth/sign-in?next=/settings/privacy" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link></div>}
    </Container>
  </main>;
}
