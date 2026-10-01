'use client';

import { FormEvent, useMemo, useState } from 'react';
import { FaArrowRight, FaCircleCheck } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type FormState = {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  websiteUrl: string;
  region: string;
  planInterest: string;
  goals: string;
};

const initialState: FormState = {
  organizationName: '',
  contactName: '',
  contactEmail: '',
  websiteUrl: '',
  region: 'central-virginia',
  planInterest: 'network',
  goals: '',
};

export function PartnerInterestForm() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [form, setForm] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) {
      setError('RCL Network is temporarily unavailable. Please try again shortly.');
      return;
    }
    if (!form.organizationName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      setError('Organization name, contact name, and email are required.');
      return;
    }

    setBusy(true);
    setError('');
    const { error: insertError } = await db.from('network_partner_inquiries').insert({
      organization_name: form.organizationName.trim(),
      contact_name: form.contactName.trim(),
      contact_email: form.contactEmail.trim(),
      website_url: form.websiteUrl.trim() || null,
      region: form.region,
      plan_interest: form.planInterest,
      goals: form.goals.trim() || null,
      status: 'new',
    });
    setBusy(false);

    if (insertError) {
      console.error('Unable to submit RCL Network partner inquiry', insertError);
      setError('We could not send that request. Please review your information and try again.');
      return;
    }

    setSent(true);
    setForm(initialState);
  }

  if (sent) {
    return (
      <section className="rounded-2xl border border-rcl-blue/25 bg-rcl-blue/[.06] p-6 sm:p-8">
        <FaCircleCheck className="text-3xl text-rcl-blue" />
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Request received</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase">Your organization is on our radar.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">The RCL team can review your organization, exposure goals, and the Network level that makes the most sense. Submitting this form does not change how you run your program.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/30 px-4 text-xs font-black uppercase tracking-wide text-rcl-blue">Submit another organization <FaArrowRight /></button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-rcl-blue/20 bg-[#071522]/75 p-5 sm:p-7">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Organization name">
          <input required value={form.organizationName} onChange={(event) => update('organizationName', event.target.value)} maxLength={160} placeholder="Virginia basketball organization" className="rcl-network-input" />
        </Field>
        <Field label="Contact name">
          <input required value={form.contactName} onChange={(event) => update('contactName', event.target.value)} maxLength={120} placeholder="Your name" className="rcl-network-input" />
        </Field>
        <Field label="Email">
          <input required type="email" value={form.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} maxLength={320} placeholder="you@organization.com" className="rcl-network-input" />
        </Field>
        <Field label="Website or primary link">
          <input type="url" value={form.websiteUrl} onChange={(event) => update('websiteUrl', event.target.value)} placeholder="https://" className="rcl-network-input" />
        </Field>
        <Field label="Virginia region">
          <select value={form.region} onChange={(event) => update('region', event.target.value)} className="rcl-network-input">
            <option value="central-virginia">Central Virginia</option>
            <option value="hampton-roads">Hampton Roads</option>
            <option value="northern-virginia">Northern Virginia</option>
            <option value="shenandoah">Shenandoah Valley</option>
            <option value="southwest-virginia">Southwest Virginia</option>
            <option value="statewide">Statewide</option>
            <option value="other">Other Virginia area</option>
          </select>
        </Field>
        <Field label="Exposure level">
          <select value={form.planInterest} onChange={(event) => update('planInterest', event.target.value)} className="rcl-network-input">
            <option value="network">Network Listing — Free</option>
            <option value="amplify">Amplify</option>
            <option value="premier">Premier Partner</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </Field>
      </div>

      <Field label="What do you want more people to discover?" className="mt-5">
        <textarea value={form.goals} onChange={(event) => update('goals', event.target.value)} maxLength={3000} rows={5} placeholder="Tell us about your league, tournament, program, events, audience, or the exposure you want to build." className="rcl-network-input resize-y" />
      </Field>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-5 text-white/35">RCL Network is an exposure and discovery partner. Your organization keeps control of registration, payments, scheduling, rosters, and operations.</p>
        <button disabled={busy} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-[#03101a] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Sending…' : 'Join the Network'} <FaArrowRight /></button>
      </div>

      <style jsx>{`
        :global(.rcl-network-input) {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(21,159,255,.18);
          background: #050b12;
          padding: 12px 14px;
          color: #f6f8fb;
          outline: none;
        }
        :global(.rcl-network-input:focus) {
          border-color: rgba(21,159,255,.68);
          box-shadow: 0 0 0 3px rgba(21,159,255,.08);
        }
        :global(textarea.rcl-network-input) { min-height: 132px; }
      `}</style>
    </form>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/50">{label}</span>{children}</label>;
}
