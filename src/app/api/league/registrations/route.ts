import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createOrReuseRegistrationCheckout } from '@/lib/league-registration-payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Field = { key?: unknown; label?: unknown; type?: unknown; required?: unknown; options?: unknown };

function cleanText(value: unknown, max = 300) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}
function ageOn(dateOfBirth: string, referenceDate: string) {
  const birth = new Date(dateOfBirth + 'T00:00:00Z');
  const ref = new Date(referenceDate + 'T00:00:00Z');
  let years = ref.getUTCFullYear() - birth.getUTCFullYear();
  if (ref.getUTCMonth() < birth.getUTCMonth() || (ref.getUTCMonth() === birth.getUTCMonth() && ref.getUTCDate() < birth.getUTCDate())) years -= 1;
  return years;
}
function validateFieldAnswers(fields: Field[], input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Complete the required application questions.');
  const source = input as Record<string, unknown>;
  const answers: Record<string, string | number | boolean> = {};
  const snapshot: Array<Record<string, unknown>> = [];
  for (const candidate of fields.slice(0, 25)) {
    const key = typeof candidate.key === 'string' ? candidate.key : '';
    const label = typeof candidate.label === 'string' ? candidate.label.slice(0, 100) : '';
    const type = candidate.type;
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key) || !label || !['text', 'textarea', 'number', 'date', 'select', 'checkbox'].includes(String(type))) continue;
    const required = candidate.required === true;
    const raw = source[key];
    const blank = raw == null || raw === '' || (typeof raw === 'string' && !raw.trim());
    if (required && blank) throw new Error('Complete the required question: ' + label + '.');
    if (blank) { snapshot.push({ key, label, type, required, options: candidate.options ?? [], answer: null }); continue; }
    if (type === 'checkbox') {
      if (typeof raw !== 'boolean') throw new Error('Answer the question: ' + label + '.');
      answers[key] = raw;
    } else if (type === 'number') {
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value)) throw new Error('Enter a valid number for: ' + label + '.');
      answers[key] = value;
    } else if (type === 'select') {
      const options = Array.isArray(candidate.options) ? candidate.options.filter((x): x is string => typeof x === 'string') : [];
      if (typeof raw !== 'string' || !options.includes(raw)) throw new Error('Choose a valid option for: ' + label + '.');
      answers[key] = raw;
    } else {
      if (typeof raw !== 'string' || raw.length > 2000) throw new Error('Enter a valid response for: ' + label + '.');
      answers[key] = raw.trim();
    }
    snapshot.push({ key, label, type, required, options: candidate.options ?? [], answer: answers[key] });
  }
  return { answers, snapshot };
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Registration service is unavailable.' }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in to submit a league application.' }, { status: 401 });
  const db = getSupabaseAdminClient() as any;
  if (!db) return NextResponse.json({ error: 'Registration data service is unavailable.' }, { status: 503 });

  let input: any;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Valid application data is required.' }, { status: 400 }); }
  const seasonId = typeof input?.season_id === 'string' ? input.season_id : '';
  const divisionId = typeof input?.division_id === 'string' ? input.division_id : '';
  const firstName = cleanText(input?.first_name, 100);
  const lastName = cleanText(input?.last_name, 100);
  const email = cleanText(input?.email, 320).toLowerCase();
  const dateOfBirth = typeof input?.date_of_birth === 'string' ? input.date_of_birth : '';
  const emergencyName = cleanText(input?.emergency_contact?.name, 120);
  const emergencyPhone = cleanText(input?.emergency_contact?.phone, 40);
  const emergencyRelation = cleanText(input?.emergency_contact?.relationship, 80);
  if (!seasonId || !divisionId || !firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter your name, valid email, season, and division.' }, { status: 400 });
  }
  if (!emergencyName || emergencyPhone.replace(/\D/g, '').length < 7) {
    return NextResponse.json({ error: 'Enter an emergency contact name and valid phone number.' }, { status: 400 });
  }

  const [{ data: season, error: seasonError }, { data: division, error: divisionError }] = await Promise.all([
    db.from('seasons').select('id,name,start_date,registration_open').eq('id', seasonId).maybeSingle(),
    db.from('divisions').select('id,season_id,name,min_registration_age,max_registration_age,registration_fee_cents,registration_currency,registration_fields,waiver_title,waiver_body,waiver_version').eq('id', divisionId).maybeSingle(),
  ]);
  if (seasonError || divisionError) return NextResponse.json({ error: 'Unable to verify this league application.' }, { status: 500 });
  if (!season || !season.registration_open || !division || division.season_id !== season.id) {
    return NextResponse.json({ error: 'This season or division is not currently accepting applications.' }, { status: 409 });
  }
  if (division.registration_fee_cents == null) {
    return NextResponse.json({ error: 'Registration pricing is being finalized. Contact the league before applying.' }, { status: 409 });
  }
  const feeCents = Number(division.registration_fee_cents);
  const currency = String(division.registration_currency || 'usd').toLowerCase();
  if (!Number.isInteger(feeCents) || feeCents < 0 || currency !== 'usd' || (feeCents > 0 && feeCents < 50)) {
    return NextResponse.json({ error: 'The division registration fee is not configured for checkout.' }, { status: 409 });
  }

  let eligibilityAnswers: Record<string, number | null> = { age_at_season_start: null };
  if (dateOfBirth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(Date.parse(dateOfBirth + 'T00:00:00Z'))) {
      return NextResponse.json({ error: 'Enter a valid date of birth.' }, { status: 400 });
    }
    const age = ageOn(dateOfBirth, season.start_date);
    if (age < 0 || age > 120) return NextResponse.json({ error: 'Enter a valid date of birth.' }, { status: 400 });
    eligibilityAnswers = { age_at_season_start: age };
    if (division.min_registration_age != null && age < Number(division.min_registration_age)) return NextResponse.json({ error: 'This division requires applicants to be at least ' + division.min_registration_age + ' by the season start date.' }, { status: 422 });
    if (division.max_registration_age != null && age > Number(division.max_registration_age)) return NextResponse.json({ error: 'This division is limited to applicants age ' + division.max_registration_age + ' or younger at season start.' }, { status: 422 });
  } else if (division.min_registration_age != null || division.max_registration_age != null) {
    return NextResponse.json({ error: 'Date of birth is required to verify this division’s age eligibility.' }, { status: 400 });
  }

  const fields = Array.isArray(division.registration_fields) ? division.registration_fields as Field[] : [];
  let validated;
  try { validated = validateFieldAnswers(fields, input?.custom_answers); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Check the required application fields.' }, { status: 400 }); }

  const waiverBody = typeof division.waiver_body === 'string' && division.waiver_body.trim() ? division.waiver_body : null;
  const waiverTitle = waiverBody ? cleanText(division.waiver_title, 160) : null;
  const waiverVersion = waiverBody ? cleanText(division.waiver_version, 80) : null;
  const signedName = cleanText(input?.signed_name, 201);
  const expectedName = (firstName + ' ' + lastName).replace(/\s+/g, ' ').toLocaleLowerCase();
  if (waiverBody && (input?.waiver_accepted !== true || !waiverTitle || !waiverVersion || signedName.replace(/\s+/g, ' ').toLocaleLowerCase() !== expectedName)) {
    return NextResponse.json({ error: 'Read the current waiver, check the acceptance box, and type your full legal name to sign.' }, { status: 400 });
  }

  const { data: prior, error: priorError } = await db.from('registrations')
    .select('id').eq('applicant_id', user.id).eq('season_id', seasonId).limit(1);
  if (priorError) return NextResponse.json({ error: 'Unable to check your existing applications.' }, { status: 500 });
  if (prior?.length) return NextResponse.json({ error: 'You already have an application for this season.' }, { status: 409 });

  const registrationPayload = {
    season_id: seasonId, division_id: divisionId, applicant_id: user.id, team_id: null,
    first_name: firstName, last_name: lastName, email, date_of_birth: dateOfBirth || null,
    emergency_contact: { name: emergencyName, phone: emergencyPhone, relationship: emergencyRelation },
    status: 'pending', submitted_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null, notes: null,
  };
  const { data: registration, error: insertError } = await db.from('registrations').insert(registrationPayload).select('id').single();
  if (insertError || !registration) {
    console.error('RCH league application save failed', insertError);
    return NextResponse.json({ error: 'Unable to save your application. Check your information and try again.' }, { status: 500 });
  }

  const acceptedAt = waiverBody ? new Date().toISOString() : null;
  const { error: responseError } = await db.from('registration_responses').insert({
    registration_id: registration.id,
    custom_answers: validated.answers,
    registration_fields_snapshot: validated.snapshot,
    eligibility_answers: eligibilityAnswers,
    waiver_title: waiverTitle,
    waiver_body_snapshot: waiverBody,
    waiver_version: waiverVersion,
    signed_name: waiverBody ? signedName : null,
    waiver_accepted_at: acceptedAt,
    fee_amount_cents: feeCents,
    fee_currency: currency,
  });
  if (responseError) {
    await db.from('registrations').delete().eq('id', registration.id);
    console.error('RCH league application response save failed', responseError);
    return NextResponse.json({ error: 'Unable to save your application details. Try again.' }, { status: 500 });
  }

  if (feeCents > 0) {
    try {
      const checkout = await createOrReuseRegistrationCheckout(db, registration.id, user.id);
      return NextResponse.json({ registration_id: registration.id, fee_amount_cents: feeCents, payment_required: true, checkout_url: checkout.checkoutUrl ?? null, payment_pending: checkout.processing === true, payment_error: null }, { status: 201 });
    } catch (error) {
      console.error('RCH registration checkout could not start', error);
      return NextResponse.json({ registration_id: registration.id, fee_amount_cents: feeCents, payment_required: true, checkout_url: null, payment_pending: false, payment_error: 'Your application was saved. Payment could not start yet; use the retry payment action below.' }, { status: 201 });
    }
  }
  return NextResponse.json({ registration_id: registration.id, fee_amount_cents: 0, payment_required: false, checkout_url: null, payment_pending: false, payment_error: null }, { status: 201 });
}
