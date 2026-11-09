import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createOrReuseRegistrationCheckout } from '@/lib/league-registration-payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Registration payment service is unavailable.' }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in to continue payment.' }, { status: 401 });
  const db = getSupabaseAdminClient() as any;
  if (!db) return NextResponse.json({ error: 'Payment records are unavailable.' }, { status: 503 });
  let input: any;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'A registration ID is required.' }, { status: 400 }); }
  if (typeof input?.registration_id !== 'string') return NextResponse.json({ error: 'A registration ID is required.' }, { status: 400 });
  try {
    const result = await createOrReuseRegistrationCheckout(db, input.registration_id, user.id);
    return NextResponse.json({
      registration_id: input.registration_id,
      payment_required: result.paymentRequired,
      paid: result.paid === true,
      payment_pending: result.processing === true,
      checkout_url: result.checkoutUrl ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start registration payment.' }, { status: 400 });
  }
}
