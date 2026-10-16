'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_GRAVITY_LOCATION,
  GRAVITY_LOCATION_EVENT, GRAVITY_LOCATION_KEY,
  gravityCityFromCoordinates, gravityCityFromId,
  readGravityLocation, saveGravityLocation,
  type GravityLocation, type GravityRadius,
} from '@/lib/rch-gravity-location';

export function useGravityLocation() {
  const [location, setLocation] = useState<GravityLocation>(DEFAULT_GRAVITY_LOCATION);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => setLocation(readGravityLocation());
    const onCustom = (event: Event) => {
      const value = (event as CustomEvent<GravityLocation>).detail;
      setLocation(value || readGravityLocation());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === GRAVITY_LOCATION_KEY || event.key === null) refresh();
    };
    refresh();
    window.addEventListener(GRAVITY_LOCATION_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(GRAVITY_LOCATION_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const chooseCity = useCallback((cityId: string) => {
    setError('');
    setLocation(saveGravityLocation({ ...readGravityLocation(), cityId, source:'manual' }));
  }, []);

  const chooseRadius = useCallback((radiusMiles: GravityRadius) => {
    setError('');
    setLocation(saveGravityLocation({ ...readGravityLocation(), radiusMiles }));
  }, []);

  const statewide = useCallback(() => {
    setError('');
    setLocation(saveGravityLocation(DEFAULT_GRAVITY_LOCATION));
  }, []);

  const chooseApproximateDeviceCity = useCallback(async () => {
    setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Device location is unavailable. Select a Virginia city instead.');
      return;
    }
    setPending(true);
    try {
      // This prompt is only reached from the member's deliberate button click.
      const cityId = await new Promise<string>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          position => {
            const coarseCityId = gravityCityFromCoordinates(position.coords.latitude, position.coords.longitude);
            if (!coarseCityId) reject(new Error('Your device location is outside our Virginia map. Choose a city manually.'));
            else resolve(coarseCityId);
          },
          () => reject(new Error('Location permission was not granted. Select your city manually.')),
          {enableHighAccuracy:false, maximumAge:600000, timeout:12000}
        );
      });
      // Only the city ID goes into the saved preference, never coordinates.
      setLocation(saveGravityLocation({...readGravityLocation(),cityId,source:'device'}));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Choose a city manually.');
    } finally {
      setPending(false);
    }
  }, []);

  return {
    location,
    city:gravityCityFromId(location.cityId),
    chooseCity, chooseRadius, statewide, chooseApproximateDeviceCity,
    pending, error,
  };
}
