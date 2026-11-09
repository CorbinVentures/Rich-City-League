'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Division, Season } from '@/types/database';

type RegistrationField = { key: string; label: string; type: 'text'|'textarea'|'number'|'date'|'select'|'checkbox'; required?: boolean; options?: string[] };

function feeLabel(cents: number | null, currency: string) {
  if (cents == null) return 'Pricing not configured';
  if (cents === 0) return 'No registration fee';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export function RegistrationForm({ seasons, divisions }: { seasons: Season[]; divisions: Division[] }) {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [divisionId, setDivisionId] = useState('');
  const [form, setForm] = useState({
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    email: '',
    dateOfBirth: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
  });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string|number|boolean>>({});
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [checkoutState, setCheckoutState] = useState<'none'|'success'|'cancelled'>('none');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const selectedSeason = seasons.find((season) => season.id === seasonId);
  const selectedDivision = divisions.find((division) => division.id === divisionId && division.season_id === seasonId);
  const fields = (Array.isArray(selectedDivision?.registration_fields) ? selectedDivision.registration_fields : []) as RegistrationField[];
  const hasWaiver = Boolean(selectedDivision?.waiver_body?.trim());
  const ageRestricted = selectedDivision?.min_registration_age != null || selectedDivision?.max_registration_age != null;
  const feeCents = selectedDivision?.registration_fee_cents ?? null;

  useEffect(() => {
    if (user?.email) setForm((current) => current.email ? current : { ...current, email: user.email ?? '' });
  }, [user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedId = params.get('registration');
    const checkout = params.get('checkout');
    if (!returnedId || (checkout !== 'success' && checkout !== 'cancelled')) return;
    setRegistrationId(returnedId);
    setCheckoutState(checkout);
    setAlreadySubmitted(true);
    if (checkout === 'cancelled') {
      setMessage('Payment was cancelled. Your application is saved; you can resume payment below.');
      return;
    }
    setMessage('Checking your payment confirmation…');
    let live = true;
    async function confirmPayment() {
      if (!supabase) return;
      const { data, error } = await supabase.from('payments').select('status').eq('registration_id', returnedId).order('created_at', { ascending: false }).limit(1);
      if (!live) return;
      if (error || !data?.length || data[0].status === 'pending') setMessage('Stripe returned you to RCH. Payment confirmation is still processing; refresh this page in a moment.');
      else if (data[0].status === 'paid') setMessage('Payment confirmed. Your league application is now pending staff review.');
      else if (data[0].status === 'waived') setMessage('Your league application is saved and the fee is marked as waived.');
      else setMessage('Payment was not completed. Your application is saved; you can resume payment below.');
    }
    void confirmPayment();
    return () => { live = false; };
  }, [supabase]);

  useEffect(() => {
    setDivisionId('');
    setCustomAnswers({});
    setWaiverAccepted(false);
    setSignedName('');
    setMessage(null);
    setRegistrationId('');
    setAlreadySubmitted(false);
  }, [seasonId]);

  async function retryPayment() {
    if (!registrationId || !user) return;
    setRetryingPayment(true);
    setMessage(null);
    try {
      const response = await fetch('/api/league/registrations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ registration_id: registrationId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start payment.');
      if (result.checkout_url) window.location.assign(result.checkout_url);
      else if (result.paid) setMessage('Payment is already confirmed. Your application is pending league review.');
      else setMessage('Payment confirmation is still processing. Refresh this page shortly.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resume payment.');
    } finally {
      setRetryingPayment(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) { setMessage('Sign in before submitting a registration.'); return; }
    if (!selectedSeason || !selectedDivision || feeCents == null) {
      setMessage('Choose a division with complete registration pricing.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/league/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          season_id: seasonId,
          division_id: divisionId,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          date_of_birth: form.dateOfBirth,
          emergency_contact: { name: form.emergencyName, phone: form.emergencyPhone, relationship: form.emergencyRelationship },
          custom_answers: customAnswers,
          waiver_accepted: waiverAccepted,
          signed_name: signedName,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit your application.');
      setRegistrationId(result.registration_id);
      setAlreadySubmitted(true);
      if (result.checkout_url) {
        setMessage('Application saved. Opening secure Stripe checkout…');
        window.location.assign(result.checkout_url);
        return;
      }
      if (result.payment_required && result.payment_error) {
        setMessage(result.payment_error);
        return;
      }
      setMessage(result.payment_pending
        ? 'Application saved. Payment confirmation is processing; check back shortly.'
        : 'Application submitted. It is pending league review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit registration.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3 text-white';
  const availableDivisions = divisions.filter((division) => division.season_id === seasonId);

  return <section id="official-registration" className="mt-8 scroll-mt-24 rounded-xl border border-white/15 bg-white/[.025] p-4 sm:p-6" aria-labelledby="official-registration-title">
    <h2 id="official-registration-title" className="text-xl font-bold">Official league registration</h2>
    {seasons.length ? <p className="mt-2 text-sm text-white/70">Complete your RCH application. League staff review eligibility, required documents, and payment before confirming a roster place.</p> : null}
    {message && <p role="status" className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/80">{message}</p>}
    {registrationId && alreadySubmitted && feeCents !== 0 && checkoutState !== 'success' && <button type="button" disabled={retryingPayment} onClick={() => void retryPayment()} className="mt-3 rounded-lg bg-rcl-gold px-4 py-2.5 text-sm font-bold text-rcl-black disabled:opacity-50">{retryingPayment ? 'Opening checkout…' : 'Resume registration payment'}</button>}
    {!seasons.length ? <p className="mt-3 text-sm text-white/60">No RCH season is currently accepting applications.</p> : <form onSubmit={submit} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-gray-300">Season<select required value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className={inputClass} disabled={alreadySubmitted}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
        <label className="text-sm text-gray-300">Division<select required value={divisionId} onChange={(event) => setDivisionId(event.target.value)} className={inputClass} disabled={alreadySubmitted}><option value="">Select a division</option>{availableDivisions.map((division) => <option key={division.id} value={division.id} disabled={division.registration_fee_cents == null}>{division.name}{division.age_group ? ' · ' + division.age_group : ''} — {feeLabel(division.registration_fee_cents, division.registration_currency || 'usd')}</option>)}</select></label>
        <label className="text-sm text-gray-300">First name<input required maxLength={100} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
        <label className="text-sm text-gray-300">Last name<input required maxLength={100} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
        <label className="text-sm text-gray-300">Email<input required maxLength={320} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
        <label className="text-sm text-gray-300">Date of birth{ageRestricted ? ' · required for eligibility' : ' · optional'}<input type="date" required={ageRestricted} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
      </div>
      {selectedDivision && <div className="mt-5 rounded-xl border border-blue-300/15 bg-blue-300/[.04] p-4"><p className="text-xs font-black uppercase tracking-wider text-blue-100">Eligibility and fee</p><p className="mt-2 text-sm text-white/70">{selectedDivision.min_registration_age != null || selectedDivision.max_registration_age != null ? 'Age is checked on the first day of the selected season.' : 'No age limit is configured for this division.'}</p><p className="mt-1 text-sm text-white/70">Registration fee: <strong>{feeLabel(selectedDivision.registration_fee_cents, selectedDivision.registration_currency || 'usd')}</strong></p></div>}
      {selectedDivision && fields.map((field) => <label key={field.key} className="mt-4 block text-sm text-gray-300">{field.label}{field.required ? ' *' : ''}{field.type === 'textarea' ? <textarea required={field.required} maxLength={2000} value={String(customAnswers[field.key] ?? '')} onChange={(event) => setCustomAnswers({ ...customAnswers, [field.key]: event.target.value })} className={inputClass} disabled={alreadySubmitted} rows={3} /> : field.type === 'select' ? <select required={field.required} value={String(customAnswers[field.key] ?? '')} onChange={(event) => setCustomAnswers({ ...customAnswers, [field.key]: event.target.value })} className={inputClass} disabled={alreadySubmitted}><option value="">Choose an option</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'checkbox' ? <span className="mt-2 flex items-center gap-3"><input type="checkbox" checked={customAnswers[field.key] === true} onChange={(event) => setCustomAnswers({ ...customAnswers, [field.key]: event.target.checked })} disabled={alreadySubmitted} className="h-4 w-4 accent-orange-400"/><span className="text-sm text-white/65">Yes</span></span> : <input type={field.type === 'number' || field.type === 'date' ? field.type : 'text'} required={field.required} maxLength={field.type === 'number' || field.type === 'date' ? undefined : 2000} value={String(customAnswers[field.key] ?? '')} onChange={(event) => setCustomAnswers({ ...customAnswers, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value })} className={inputClass} disabled={alreadySubmitted} />}</label>)}
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="font-semibold text-white">Emergency contact</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-gray-300">Contact name<input required maxLength={120} value={form.emergencyName} onChange={(event) => setForm({ ...form, emergencyName: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
          <label className="text-sm text-gray-300">Phone<input required maxLength={40} type="tel" value={form.emergencyPhone} onChange={(event) => setForm({ ...form, emergencyPhone: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
          <label className="text-sm text-gray-300">Relationship<input maxLength={80} value={form.emergencyRelationship} onChange={(event) => setForm({ ...form, emergencyRelationship: event.target.value })} className={inputClass} disabled={alreadySubmitted} /></label>
        </div>
      </div>
      {hasWaiver && selectedDivision && <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-100">{selectedDivision.waiver_title} · Version {selectedDivision.waiver_version}</p><div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-sm leading-6 text-white/70">{selectedDivision.waiver_body}</div><label className="mt-4 flex items-start gap-3 text-sm text-white/75"><input type="checkbox" required checked={waiverAccepted} onChange={(event) => setWaiverAccepted(event.target.checked)} disabled={alreadySubmitted} className="mt-1 h-4 w-4 accent-orange-400"/>I have read and agree to the current waiver and participation terms.</label><label className="mt-4 block text-sm text-gray-300">Type your full legal name to sign<input required maxLength={201} value={signedName} onChange={(event) => setSignedName(event.target.value)} className={inputClass} disabled={alreadySubmitted} /></label></div>}
      <button disabled={submitting || !user || !seasonId || !divisionId || feeCents == null || alreadySubmitted} className="mt-6 rounded-lg bg-rcl-gold px-5 py-3 font-bold text-rcl-black disabled:opacity-50">{submitting ? 'Submitting…' : feeCents && feeCents > 0 ? 'Submit application and pay' : 'Submit application'}</button>
      {!user && <p className="mt-3 text-sm text-amber-200/80">Sign in to submit your application. Player applications are connected to your RCH profile.</p>}
      {selectedDivision && selectedDivision.registration_fee_cents == null && <p className="mt-3 text-sm text-amber-200/80">The league has not finalized this division’s registration price yet.</p>}
    </form>}
  </section>;
}
