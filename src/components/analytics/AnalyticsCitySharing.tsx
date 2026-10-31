'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useGravityLocation } from '@/hooks/useGravityLocation';

export function AnalyticsCitySharing() {
  const db = useMemo(() => getSupabaseClient(), []);
  const { city } = useGravityLocation();
  const [profileId, setProfileId] = useState<string|null>(null);
  const [sharedCity, setSharedCity] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!db) { setNotice('City sharing is unavailable.'); setLoading(false); return; }
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setLoading(false); return; }
    setProfileId(user.id);
    const { data, error } = await (db as any).from('rch_analytics_city_consent')
      .select('city_id').eq('profile_id', user.id).maybeSingle();
    if (error) setNotice('Analytics city sharing is currently unavailable.');
    else setSharedCity(data?.city_id ?? null);
    setLoading(false);
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);

  const share = async () => {
    if (!db || !profileId || !city) return;
    setBusy(true); setNotice('');
    const { error } = await (db as any).from('rch_analytics_city_consent')
      .upsert({profile_id:profileId,city_id:city.id,updated_at:new Date().toISOString()}, {onConflict:'profile_id'});
    if (error) setNotice('Could not save your choice. Please retry.');
    else { setSharedCity(city.id); setNotice('Your city is now included in aggregate planning.'); }
    setBusy(false);
  };
  const revoke = async () => {
    if (!db || !profileId) return;
    setBusy(true); setNotice('');
    const { error } = await (db as any).from('rch_analytics_city_consent')
      .delete().eq('profile_id',profileId);
    if (error) setNotice('Could not remove your city. Please retry.');
    else { setSharedCity(null); setNotice('City sharing removed. Your discovery settings are unchanged.'); }
    setBusy(false);
  };

  return <section className="rounded-2xl border border-[#315878] bg-[#0b253b] p-6" aria-labelledby="analytics-city-title">
    <h2 id="analytics-city-title" className="text-lg font-bold">Help RCH plan basketball in your city</h2>
    <p className="mt-2 text-sm leading-6 text-[#d2e1ed]">Optional: share only your selected Virginia city for anonymous, grouped Command Center planning. No exact location, travel history, address or GPS coordinates are transmitted. Small groups are hidden. This does not prove event attendance. You can withdraw your city at any time.</p>
    {loading ? <p className="mt-4 text-sm text-[#b3cadf]">Checking your choice…</p> :
      !profileId ? <p className="mt-4 text-sm">Sign in to share your city.</p> :
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-white">Shared for analytics: {sharedCity ? sharedCity.replaceAll('-',' ') : 'Not shared'}</p>
        <button type="button" onClick={()=>void share()} disabled={!city||busy||sharedCity===city.id}
          className="min-h-11 rounded-xl bg-[#89c9f7] px-4 text-sm font-bold text-[#061727] disabled:cursor-not-allowed disabled:opacity-50">
          {sharedCity ? 'Update shared city' : 'Share selected city'}
        </button>
        {sharedCity && <button type="button" onClick={()=>void revoke()} disabled={busy}
          className="min-h-11 rounded-xl border border-[#8ab8d8] px-4 text-sm font-bold text-white disabled:opacity-50">Stop sharing</button>}
        {!city && <span className="text-xs text-[#b3cadf]">Select a city above before sharing.</span>}
      </div>}
    {notice && <p role="status" className="mt-3 text-sm text-[#c2e0f7]">{notice}</p>}
  </section>;
}
