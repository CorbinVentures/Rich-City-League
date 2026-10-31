'use client';

import { getSupabaseClient } from '@/lib/supabase';

export type ConversionEvent =
  | 'home_view'
  | 'first_action_click'
  | 'join_click'
  | 'signup_view'
  | 'signup_account_continue'
  | 'signup_role_continue'
  | 'signup_submitted'
  | 'signup_created'
  | 'signup_failed';

const SESSION_KEY = 'rch:site-analytics-tab-session';
const CONTEXTS = new Set([
  'home_hero', 'home_benefits', 'home_footer', 'header', 'welcome',
  'audience_player', 'audience_fan', 'audience_coach',
  'audience_creator', 'audience_organizer', 'email', 'oauth',
  'unknown',
]);

// Aggregated funnel telemetry. No email, name, query string, precise location,
// password, IP, fingerprint or device identifier is submitted from this code.
export function trackRchConversion(event: ConversionEvent, context = 'unknown') {
  if (typeof window === 'undefined') return;
  const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (privacy.doNotTrack === '1' || privacy.globalPrivacyControl === true) return;
  const db = getSupabaseClient();
  if (!db) return;

  try {
    let session = window.sessionStorage.getItem(SESSION_KEY);
    if (!session || !/^[a-f0-9-]{36}$/i.test(session)) {
      session = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, session);
    }
    // Insert-only and de-duplicated by session, event, context and hour.
    const safeContext = CONTEXTS.has(context) ? context : 'unknown';
    void (db as any).from('rch_conversion_events').insert({
      session_id: session,
      event_type: event,
      context: safeContext,
    }).then(() => {}, () => {});
  } catch {
    // Signup and browsing must work if storage or analytics is unavailable.
  }
}
