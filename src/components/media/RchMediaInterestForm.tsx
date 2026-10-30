'use client';

import { FormEvent, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { getRchMediaOffer, RCH_MEDIA_OFFERS, type RchMediaOfferCode } from '@/lib/rch-media-offers';

type FormFields = {
  organization: string;
  contact: string;
  email: string;
  city: string;
  region: string;
  offer: RchMediaOfferCode;
  eventDate: string;
  details: string;
  rights: boolean;
  consent: boolean;
  website: string;
};
const initial: FormFields = {
  organization: '', contact: '', email: '', city: '', region: 'central-virginia',
  offer: 'event-production', eventDate: '', details: '', rights: false,
  consent: false, website: '',
};
const field = 'min-h-12 w-full rounded-xl border border-white/20 bg-[#081725] px-4 py-3 text-sm text-white outline-none focus:border-rcl-orange focus:ring-2 focus:ring-rcl-orange/20';

export function RchMediaInterestForm() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [form, setForm] = useState<FormFields>(initial);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // Bot trap: do not submit leads that have filled an invisible field.
    if (form.website) return;
    const offer = getRchMediaOffer(form.offer);
    if (!offer || form.organization.trim().length < 2 || form.contact.trim().length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please add your organization, contact name, and a valid email.');
      return;
    }
    if (!form.consent || !form.rights) {
      setError('Please confirm the contact and footage-authorization acknowledgments.');
      return;
    }
    if (!db) {
      setError('Requests are unavailable at the moment. Email info@richcityhoops.com to inquire.');
      return;
    }
    setBusy(true);
    setError('');
    const goals = [
      'RCH MEDIA / STUDIOS COMMERCIAL INQUIRY',
      'Offer: ' + offer.name + ' (' + offer.code + ')',
      'Indicative price: ' + offer.label + ' (not a quote)',
      form.eventDate ? 'Proposed event date: ' + form.eventDate : '',
      'Footage rights: client acknowledges clearance is required; no license granted by this form',
      'Follow-up contact: consent provided',
      form.details.trim() ? 'Project: ' + form.details.trim() : '',
    ].filter(Boolean).join('\n').slice(0, 3000);

    const { error: insertError } = await db.from('network_partner_inquiries').insert({
      organization_name: form.organization.trim(),
      organization_type: offer.type === 'sponsorship' ? 'business' : 'media',
      contact_name: form.contact.trim(),
      contact_email: form.email.trim(),
      city: form.city.trim() || null,
      region: form.region,
      plan_interest: offer.type === 'sponsorship' ? 'business-advertising' : 'unsure',
      goals,
      source: 'partner-application',
      status: 'new',
    });
    setBusy(false);
    if (insertError) {
      setError('Could not submit the request. Please try again or email info@richcityhoops.com.');
      return;
    }
    setSent(true);
    setForm(initial);
  }

  if (sent) {
    return <section role="status" className="rounded-3xl border border-rcl-blue/30 bg-[#071522] p-7">
      <h3 className="font-display text-2xl font-black uppercase">Request received</h3>
      <p className="mt-3 text-sm leading-6 text-white/70">Your proposal is in the RCH review pipeline. This is not a booking, production commitment or sponsorship confirmation. We'll review the scope before discussing terms.</p>
      <button type="button" className="mt-5 min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold" onClick={() => setSent(false)}>Start another request</button>
    </section>;
  }

  return <form onSubmit={submit} className="rounded-3xl border border-white/15 bg-[#071522] p-5 sm:p-8">
    <h3 className="font-display text-2xl font-black uppercase">Tell us what you're building</h3>
    <p className="mt-2 text-sm text-white/60">No account or upfront payment required. We'll discuss availability, deliverables, rights, and a written quote.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-bold text-white/75">Organization / business
        <input className={field + ' mt-2'} maxLength={160} required value={form.organization} onChange={e => update('organization', e.target.value)} />
      </label>
      <label className="text-xs font-bold text-white/75">Contact name
        <input className={field + ' mt-2'} maxLength={120} required value={form.contact} onChange={e => update('contact', e.target.value)} />
      </label>
      <label className="text-xs font-bold text-white/75">Email
        <input className={field + ' mt-2'} type="email" maxLength={320} required value={form.email} onChange={e => update('email', e.target.value)} />
      </label>
      <label className="text-xs font-bold text-white/75">City / event location
        <input className={field + ' mt-2'} maxLength={120} value={form.city} onChange={e => update('city', e.target.value)} />
      </label>
      <label className="text-xs font-bold text-white/75">What do you need?
        <select className={field + ' mt-2'} value={form.offer} onChange={e => update('offer', e.target.value as RchMediaOfferCode)}>
          {RCH_MEDIA_OFFERS.map(offer => <option key={offer.code} value={offer.code}>{offer.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-white/75">Virginia region
        <select className={field + ' mt-2'} value={form.region} onChange={e => update('region', e.target.value)}>
          <option value="central-virginia">Central Virginia / 804</option>
          <option value="hampton-roads">Hampton Roads / 757</option>
          <option value="northern-virginia">Northern Virginia</option>
          <option value="shenandoah">Western / Shenandoah</option>
          <option value="southwest-virginia">Southwest Virginia</option>
          <option value="statewide">Statewide / multiple cities</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="text-xs font-bold text-white/75">Potential event date (optional)
        <input className={field + ' mt-2'} type="date" value={form.eventDate} onChange={e => update('eventDate', e.target.value)} />
      </label>
      <label className="text-xs font-bold text-white/75 sm:col-span-2">Project details
        <textarea className={field + ' mt-2'} maxLength={1700} rows={4} value={form.details} onChange={e => update('details', e.target.value)} placeholder="Event, number of courts, filming hours, distribution plans, sponsorship objectives…" />
      </label>
    </div>
    <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-white/70">
      <input type="checkbox" checked={form.rights} onChange={e => update('rights', e.target.checked)} className="mt-1" required/>
      <span>I understand that video distribution requires a separate agreement and appropriate event, participant, music and footage permissions. This request does not grant RCH usage rights.</span>
    </label>
    <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-white/70">
      <input type="checkbox" checked={form.consent} onChange={e => update('consent', e.target.checked)} className="mt-1" required/>
      <span>RCH may contact me about this requested project.</span>
    </label>
    <div className="absolute -left-[10000px]" aria-hidden="true"><label>Website
      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => update('website', e.target.value)} />
    </label></div>
    {error && <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}
    <button type="submit" disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-rcl-orange px-5 text-sm font-black uppercase tracking-wide text-black disabled:opacity-60">
      {busy ? 'Submitting request…' : 'Request a production or sponsor proposal'}
    </button>
    <p className="mt-3 text-xs text-white/45">Pilot prices are starting estimates, not guaranteed rates. No payment or production booking is made by this form.</p>
  </form>;
}
