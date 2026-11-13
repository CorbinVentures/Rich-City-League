'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { tapHaptic } from '@/lib/haptics';

export function BmfChampionshipInterestForm() {
  const { user, profile } = useAuth();
  const db = useMemo(() => getSupabaseClient() as any, []);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm(current => ({
      ...current,
      fullName: (profile as any)?.display_name || current.fullName,
      email: user.email || current.email,
    }));
    let active = true;
    void db.from('rch_bmf_championship_interests').select('id,full_name,email,phone,city').eq('profile_id', user.id).maybeSingle()
      .then(({ data, error: queryError }: any) => {
        if (!active) return;
        if (data) { setForm({ fullName: data.full_name, email: data.email, phone: data.phone || '', city: data.city || '' }); setSent(true); }
        if (queryError && queryError.code !== 'PGRST116') setError('Your current registration status could not be checked. You can still submit an interest request.');
        setLoading(false);
      });
    return () => { active = false; };
  }, [db, user, profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!user) return;
    setBusy(true);
    const { error: insertError } = await db.from('rch_bmf_championship_interests').upsert({
      profile_id: user.id, full_name: form.fullName.trim(), email: form.email.trim(),
      phone: form.phone.trim() || null, city: form.city.trim() || null, status: 'interest', staff_notes: null,
    }, { onConflict: 'profile_id' });
    setBusy(false);
    if (insertError) { setError('We could not save your interest yet. Please try again.'); return; }
    tapHaptic(); setSent(true);
  }

  if (!user) return <section className="rounded-3xl border border-[#6a6a6a] bg-[#171717] p-6 sm:p-8"><h2 className="font-display text-2xl font-black uppercase">Sign in to register interest</h2><p className="mt-2 text-sm leading-6 text-[#d3d3d3]">Create your free Rich City Hoops profile or sign in to join the championship update list.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/auth/sign-up?next=%2Fruns%2Fbmf-championship%2Fregister" className="inline-flex min-h-12 items-center rounded-xl bg-[#a7a7a7] px-5 text-xs font-black uppercase text-black">Create free profile</Link><Link href="/auth/sign-in?next=%2Fruns%2Fbmf-championship%2Fregister" className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 text-xs font-black uppercase text-white">Sign in</Link></div></section>;

  if (loading) return <p role="status" className="rounded-xl border border-[#6a6a6a] p-5 text-sm text-[#e0e0e0]">Checking your registration…</p>;
  if (sent) return <section className="rounded-3xl border border-gray-300/30 bg-gray-300/[.06] p-6 sm:p-8" role="status"><p className="text-xs font-black uppercase tracking-wide text-gray-200">Interest saved</p><h2 className="mt-2 font-display text-3xl font-black uppercase">You’re on the update list.</h2><p className="mt-3 text-sm leading-6 text-[#e0e0e0]">This is not a paid entry or a confirmed tournament slot. RCH will share venue, rules, entry terms and registration details when confirmed.</p></section>;

  return <form onSubmit={submit} className="rounded-3xl border border-[#6a6a6a] bg-[#171717] p-5 sm:p-8">
    <p className="text-xs font-black uppercase tracking-[.18em] text-[#a7a7a7]">BMF Championship registration</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Get the confirmed entry details.</h2><p className="mt-2 text-sm leading-6 text-[#d3d3d3]">Join the interest list now. Venue and final entry terms are still being confirmed.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Full name"><input required maxLength={160} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></Field><Field label="Email"><input required type="email" maxLength={320} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Phone (optional)"><input type="tel" maxLength={40} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="City (optional)"><input maxLength={120} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field></div>
    {error&&<p className="mt-4 rounded-xl border border-gray-300/30 bg-gray-950/40 p-4 text-sm text-gray-100" role="alert">{error}</p>}
    <button disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#a7a7a7] px-5 text-xs font-black uppercase text-black disabled:opacity-50 sm:w-auto">{busy?'Saving…':'Register interest'}</button>
    <p className="mt-4 text-xs leading-5 text-white/60">Submitting records your interest only. It does not reserve a spot or create a payment obligation.</p>
    <style jsx>{`input{width:100%;min-height:48px;border-radius:12px;border:1px solid #6a6a6a;background:#0e0e0e;padding:12px;color:white;outline:none}input:focus{border-color:#a7a7a7;box-shadow:0 0 0 3px #a7a7a733}`}</style>
  </form>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-xs font-bold text-[#e0e0e0]">{label}</span>{children}</label>;}
