import { createStripeRegistrationCheckoutSession, retrieveStripeCheckoutSession } from '@/lib/stripe-billing';

type CheckoutResult = {
  paymentRequired: boolean;
  paid?: boolean;
  processing?: boolean;
  checkoutUrl?: string | null;
  paymentId?: string | null;
};

export async function createOrReuseRegistrationCheckout(db: any, registrationId: string, userId: string): Promise<CheckoutResult> {
  const { data: registration, error: registrationError } = await db
    .from('registrations')
    .select('id,applicant_id,status,season_id,division_id,email')
    .eq('id', registrationId)
    .eq('applicant_id', userId)
    .maybeSingle();
  if (registrationError) throw registrationError;
  if (!registration) throw new Error('Registration was not found for this account.');
  if (['cancelled', 'rejected'].includes(String(registration.status).toLowerCase())) throw new Error('This registration is no longer payable.');

  const { data: response, error: responseError } = await db
    .from('registration_responses')
    .select('fee_amount_cents,fee_currency')
    .eq('registration_id', registrationId)
    .maybeSingle();
  if (responseError) throw responseError;
  const amountCents = response?.fee_amount_cents;
  const currency = String(response?.fee_currency || 'usd').toLowerCase();
  if (amountCents == null || amountCents === 0) return { paymentRequired: false };
  if (!Number.isInteger(amountCents) || amountCents < 50 || currency !== 'usd') throw new Error('The registration fee is not configured for secure checkout.');

  const { data: priorRows, error: paymentReadError } = await db
    .from('payments')
    .select('id,status,amount_cents,currency,provider,provider_checkout_session_id')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (paymentReadError) throw paymentReadError;
  const rows = priorRows ?? [];
  const paid = rows.find((row: any) => row.status === 'paid' || row.status === 'waived');
  if (paid) return { paymentRequired: true, paid: true, paymentId: paid.id };
  let pending = rows.find((row: any) => row.status === 'pending' && row.provider === 'stripe');

  if (pending?.provider_checkout_session_id) {
    const session = await retrieveStripeCheckoutSession(pending.provider_checkout_session_id);
    if (session.status === 'open' && session.url) {
      return { paymentRequired: true, checkoutUrl: session.url, paymentId: pending.id };
    }
    if (session.status === 'complete') {
      if (session.payment_status === 'paid') return { paymentRequired: true, processing: true, paymentId: pending.id };
      return { paymentRequired: true, processing: true, paymentId: pending.id };
    }
    if (session.status === 'expired') {
      const { error } = await db.from('payments').update({ status: 'failed' }).eq('id', pending.id).eq('status', 'pending');
      if (error) throw error;
      pending = null;
    }
  }

  let payment = pending;
  if (!payment) {
    const { data: created, error: createError } = await db.from('payments').insert({
      registration_id: registrationId,
      amount_cents: amountCents,
      currency,
      status: 'pending',
      provider: 'stripe',
    }).select('id,status,amount_cents,currency,provider,provider_checkout_session_id').single();
    if (createError) {
      if (createError.code === '23505') throw new Error('A payment attempt is already being prepared. Refresh and try again.');
      throw createError;
    }
    payment = created;
  }

  const [{ data: season, error: seasonError }, { data: division, error: divisionError }] = await Promise.all([
    db.from('seasons').select('name').eq('id', registration.season_id).maybeSingle(),
    db.from('divisions').select('name').eq('id', registration.division_id).maybeSingle(),
  ]);
  if (seasonError) throw seasonError;
  if (divisionError) throw divisionError;

  try {
    const session = await createStripeRegistrationCheckoutSession({
      paymentId: payment.id,
      registrationId,
      userId,
      email: registration.email,
      amountCents,
      currency,
      seasonName: season?.name || 'Rich City League season',
      divisionName: division?.name || 'League division',
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    const { error: updateError } = await db.from('payments').update({
      provider: 'stripe',
      provider_checkout_session_id: session.id,
    }).eq('id', payment.id);
    if (updateError) throw updateError;
    return { paymentRequired: true, checkoutUrl: session.url, paymentId: payment.id };
  } catch (error) {
    await db.from('payments').update({ status: 'failed' }).eq('id', payment.id).eq('status', 'pending');
    throw error;
  }
}
