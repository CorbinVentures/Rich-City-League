'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FaArrowRight, FaCircleCheck, FaShieldHalved } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

export function OrganizationClaimForm({ organizationId, organizationSlug, organizationName }:{ organizationId:string; organizationSlug:string; organizationName:string }) {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [roleTitle, setRoleTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);

  if (loading) return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/45">Checking your RCL account…</div>;
  if (!user) return <div className="rounded-2xl border border-rcl-blue/20 bg-[#071522]/70 p-6"><FaShieldHalved className="text-2xl text-rcl-blue"/><h2 className="mt-3 font-display text-3xl font-black uppercase">Sign in to claim {organizationName}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Claims are tied to a verified RCL account so we can protect organization access and keep public information trustworthy.</p><Link href={`/login?next=${encodeURIComponent(`/organizations/${organizationSlug}/claim`)}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-[#03101a]">Sign in <FaArrowRight/></Link></div>;
  if (success) return <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[.06] p-6"><FaCircleCheck className="text-2xl text-emerald-300"/><h2 className="mt-3 font-display text-3xl font-black uppercase">Claim submitted</h2><p className="mt-2 text-sm leading-6 text-white/50">RCL will review your connection to {organizationName}. Approval unlocks the partner dashboard, event submissions, promotion requests, and exposure analytics.</p><Link href="/network/dashboard" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-xs font-black uppercase tracking-wide text-white">Partner dashboard <FaArrowRight/></Link></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!roleTitle.trim() || !contactEmail.trim()) return setError('Role and contact email are required.');
    setSubmitting(true);
    const { error: submitError } = await (supabase as any).from('network_organization_claims').insert({
      organization_id: organizationId,
      claimant_id: user.id,
      role_title: roleTitle.trim(),
      contact_email: contactEmail.trim(),
      proof_url: proofUrl.trim() || null,
      proof_notes: proofNotes.trim() || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (submitError) {
      if (submitError.code === '23505') setError('You already have a pending claim for this organization.');
      else setError(submitError.message || 'Could not submit this claim.');
      return;
    }
    setSuccess(true);
  };

  return <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/70 p-6 sm:p-8">
    <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaShieldHalved/></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Organization verification</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Show us your connection</h2></div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Field label="Your role"><input value={roleTitle} onChange={e=>setRoleTitle(e.target.value)} placeholder="Owner, director, commissioner…" className="input" maxLength={120} required/></Field>
      <Field label="Organization email"><input value={contactEmail} onChange={e=>setContactEmail(e.target.value)} type="email" placeholder="you@organization.com" className="input" maxLength={320} required/></Field>
      <div className="sm:col-span-2"><Field label="Proof link (optional)"><input value={proofUrl} onChange={e=>setProofUrl(e.target.value)} type="url" placeholder="Official website, staff page, social profile…" className="input"/></Field></div>
      <div className="sm:col-span-2"><Field label="Verification notes"><textarea value={proofNotes} onChange={e=>setProofNotes(e.target.value)} placeholder="Explain how RCL can verify that you represent this organization." className="input min-h-32 resize-y" maxLength={3000}/></Field></div>
    </div>
    {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.06] p-3 text-xs text-red-200">{error}</p>}
    <button disabled={submitting} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black disabled:opacity-50">{submitting?'Submitting…':'Submit claim'} <FaArrowRight/></button>
    <p className="mt-4 text-xs leading-5 text-white/30">Approval gives you publishing tools for your RCL Network presence. It does not transfer control of your registration, payments, teams, schedules, or operations to RCL.</p>
    <style jsx>{`.input{width:100%;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);padding:11px 13px;color:white;outline:none}.input:focus{border-color:rgba(44,166,255,.55)}`}</style>
  </form>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</span>{children}</label>; }
