'use client';

import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  DEFAULT_GRAVITY_LOCATION, GRAVITY_LOCATION_EVENT,
  normalizeGravityLocation, readGravityLocation, saveGravityLocation,
} from '@/lib/rch-gravity-location';
import {
  GRAVITY_ACCOUNT_APPLIED_KEY, GRAVITY_ACCOUNT_REFRESH_EVENT,
  GRAVITY_ACCOUNT_REQUEST_EVENT, publishGravityAccountStatus,
} from '@/lib/rch-gravity-account';

const TABLE = 'gravity_member_location_preferences';

/**
 * One bridge per mounted app, avoiding multiple account fetches from each
 * consumer of useGravityLocation(). A signed-in member must EXPLICITLY enable
 * account sync. The server never receives exact geolocation.
 */
export function GravityAccountBridge() {
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      publishGravityAccountStatus({authenticated:false,loading:false,enabled:false,error:'Account sync is unavailable on this device.'});
      return;
    }
    const db = client as any;
    let disposed = false;
    let activeUserId: string | null = null;
    let initialized = false;
    let loadingId: string | null = null;
    let synced = false;
    let hydrating = false;
    let serial: Promise<void> = Promise.resolve();
    let sequence = 0;

    function appliedMarker() {
      try { return window.localStorage.getItem(GRAVITY_ACCOUNT_APPLIED_KEY) === '1'; }
      catch { return false; }
    }
    function setAppliedMarker(applied: boolean) {
      try {
        if (applied) window.localStorage.setItem(GRAVITY_ACCOUNT_APPLIED_KEY,'1');
        else window.localStorage.removeItem(GRAVITY_ACCOUNT_APPLIED_KEY);
      } catch { /* Browser storage may be restricted. */ }
    }
    function clearSyncedLocalPreference() {
      if (appliedMarker()) saveGravityLocation(DEFAULT_GRAVITY_LOCATION);
      setAppliedMarker(false);
    }
    function signOutLocal() {
      ++sequence;
      activeUserId = null;
      loadingId = null;
      initialized = true;
      synced = false;
      hydrating = false;
      clearSyncedLocalPreference();
      publishGravityAccountStatus({authenticated:false,loading:false,enabled:false,saving:false,error:null});
    }

    async function loadForMember(userId: string, force = false) {
      if (disposed) return;
      if (!force && activeUserId === userId && (initialized || loadingId === userId)) return;
      if (activeUserId !== userId && appliedMarker()) clearSyncedLocalPreference();
      const request = ++sequence;
      activeUserId = userId;
      loadingId = userId;
      initialized = false;
      synced = false;
      hydrating = true;
      publishGravityAccountStatus({authenticated:true,loading:true,enabled:false,saving:false,error:null});
      try {
        const {data,error} = await db.from(TABLE)
          .select('city_id,radius_miles').eq('profile_id',userId).maybeSingle();
        if (error) throw error;
        if (disposed || request !== sequence) return;
        synced = Boolean(data);
        if (data) {
          // Treat the authenticated account preference as authoritative.
          // Only these two coarse fields come back from Supabase.
          saveGravityLocation(normalizeGravityLocation({
            cityId:data.city_id,
            radiusMiles:data.radius_miles,
            source:'manual'
          }));
          setAppliedMarker(true);
        } else {
          // No opted-in row; do not transmit a local guest preference.
          clearSyncedLocalPreference();
        }
        publishGravityAccountStatus({authenticated:true,loading:false,enabled:synced,saving:false,error:null});
      } catch {
        if (!disposed && request === sequence) publishGravityAccountStatus({
          authenticated:true,loading:false,enabled:false,saving:false,
          error:'Account discovery sync is unavailable. Your local preferences still work.'
        });
      } finally {
        if (request === sequence) { loadingId=null; initialized=true; hydrating=false; }
      }
    }

    async function verifiedMember() {
      try {
        const {data,error} = await client.auth.getUser();
        if (disposed || error) return;
        if (!data.user) signOutLocal();
        else await loadForMember(data.user.id);
      } catch { /* Network failures must not be interpreted as sign-out. */ }
    }

    // A serialized, idempotent write pipeline ensures the latest explicit
    // preference wins on a device, without exposing coordinates or history.
    const onPreferenceChange = () => {
      if (disposed || hydrating || !synced || !initialized || !activeUserId) return;
      const actor = activeUserId;
      const location = readGravityLocation();
      serial = serial.catch(() => undefined).then(async () => {
        if (disposed || !synced || activeUserId !== actor) return;
        const {error} = await db.from(TABLE).upsert({
          profile_id:actor, city_id:location.cityId, radius_miles:location.radiusMiles
        },{onConflict:'profile_id'});
        if (error && !disposed) publishGravityAccountStatus({
          error:'This change is saved locally but could not sync to your account.'
        });
      });
    };

    const onToggle = (event: Event) => {
      const enable = Boolean((event as CustomEvent<{enabled:boolean}>).detail?.enabled);
      serial = serial.catch(() => undefined).then(async () => {
        if (disposed || !activeUserId || !initialized) return;
        const actor = activeUserId;
        publishGravityAccountStatus({saving:true,error:null});
        try {
          if (enable) {
            const preference = readGravityLocation();
            const {error} = await db.from(TABLE).upsert({
              profile_id:actor,city_id:preference.cityId,radius_miles:preference.radiusMiles
            },{onConflict:'profile_id'});
            if (error) throw error;
            if (disposed || actor !== activeUserId) return;
            synced=true;
            setAppliedMarker(true);
          } else {
            const {error} = await db.from(TABLE).delete().eq('profile_id',actor);
            if (error) throw error;
            if (disposed || actor !== activeUserId) return;
            synced=false;
            // Keep the member's current LOCAL choice when sync is turned off.
            setAppliedMarker(false);
          }
          publishGravityAccountStatus({saving:false,enabled:synced,error:null});
        } catch {
          if (!disposed && actor === activeUserId) publishGravityAccountStatus({
            saving:false,enabled:synced,error:'Could not change account sync. Please retry.'
          });
        }
      });
    };
    const onRefresh = () => {
      serial = serial.catch(() => undefined).then(async () => {
        if (activeUserId && !disposed) await loadForMember(activeUserId,true);
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && synced) onRefresh();
    };

    // Never make Supabase async calls directly inside the auth callback.
    const {data: authListener} = client.auth.onAuthStateChange((event,session) => {
      if (event === 'SIGNED_OUT') { signOutLocal(); return; }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        Promise.resolve().then(() => {
          if (!disposed && session?.user) void verifiedMember();
          else if (!disposed && event === 'INITIAL_SESSION') void verifiedMember();
        });
      }
    });
    window.addEventListener(GRAVITY_LOCATION_EVENT,onPreferenceChange);
    window.addEventListener(GRAVITY_ACCOUNT_REQUEST_EVENT,onToggle);
    window.addEventListener(GRAVITY_ACCOUNT_REFRESH_EVENT,onRefresh);
    document.addEventListener('visibilitychange',onVisibility);
    void verifiedMember();

    return () => {
      disposed = true;
      ++sequence;
      authListener.subscription.unsubscribe();
      window.removeEventListener(GRAVITY_LOCATION_EVENT,onPreferenceChange);
      window.removeEventListener(GRAVITY_ACCOUNT_REQUEST_EVENT,onToggle);
      window.removeEventListener(GRAVITY_ACCOUNT_REFRESH_EVENT,onRefresh);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  }, []);
  return null;
}
