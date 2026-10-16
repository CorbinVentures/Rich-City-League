/**
 * Coarse, opt-in Virginia discovery location.
 *
 * Store only a selected city anchor and a broad discovery radius. Never store,
 * transmit or log exact coordinates from browser geolocation. Location is a
 * relevance preference, not authorization or proof of attendance.
 */
import { VIRGINIA_CITIES, cityForText, milesBetween, virginiaCoordinates } from './virginia-world';

export const GRAVITY_LOCATION_KEY = 'rch-gravity-location-v1';
export const GRAVITY_LOCATION_EVENT = 'rch:gravity-location-changed';
export type GravityRadius = 25 | 50 | 100;
export type GravityLocation = {
  cityId: string | null;
  radiusMiles: GravityRadius;
  source: 'manual' | 'device';
};
export const DEFAULT_GRAVITY_LOCATION: GravityLocation = {
  cityId: null, radiusMiles: 50, source: 'manual',
};
export const GRAVITY_RADII: readonly GravityRadius[] = [25, 50, 100] as const;

export function gravityCityFromId(id: string | null | undefined) {
  return VIRGINIA_CITIES.find(item => item.id === id) ?? null;
}

export function normalizeGravityLocation(value: unknown): GravityLocation {
  if (!value || typeof value !== 'object') return DEFAULT_GRAVITY_LOCATION;
  const raw = value as Partial<GravityLocation>;
  const city = typeof raw.cityId === 'string' ? gravityCityFromId(raw.cityId) : null;
  const radius = GRAVITY_RADII.find(n => n === raw.radiusMiles) ?? 50;
  return {
    cityId: city?.id ?? null,
    radiusMiles: radius,
    source: city && raw.source === 'device' ? 'device' : 'manual',
  };
}

export function readGravityLocation(): GravityLocation {
  if (typeof window === 'undefined') return DEFAULT_GRAVITY_LOCATION;
  try {
    return normalizeGravityLocation(JSON.parse(window.localStorage.getItem(GRAVITY_LOCATION_KEY) || 'null'));
  } catch {
    return DEFAULT_GRAVITY_LOCATION;
  }
}

export function saveGravityLocation(location: GravityLocation): GravityLocation {
  const next = normalizeGravityLocation(location);
  if (typeof window !== 'undefined') {
    try {
      if (next.cityId) window.localStorage.setItem(GRAVITY_LOCATION_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(GRAVITY_LOCATION_KEY);
    } catch { /* Preserve in-memory value even when storage is disabled. */ }
    window.dispatchEvent(new CustomEvent(GRAVITY_LOCATION_EVENT, {detail:next}));
  }
  return next;
}

/** Centroid approximations; do NOT imply event-to-member driving distances. */
export function gravityApproxCityMiles(preferredCityId: string | null, candidateCity: string | null | undefined): number | null {
  const selected = gravityCityFromId(preferredCityId);
  const candidate = cityForText(candidateCity);
  return selected && candidate ? milesBetween(selected, candidate) : null;
}

/**
 * Proximity signal, not a hard location exclusion. Preserve unknown-city and
 * statewide opportunities so small towns and meaningful statewide events
 * still have discovery exposure.
 */
export function gravityLocalRelevance(preferredCityId: string | null, candidateCity: string | null | undefined, radiusMiles: GravityRadius = 50): number {
  if (!gravityCityFromId(preferredCityId)) return 0.35;
  const miles = gravityApproxCityMiles(preferredCityId, candidateCity);
  if (miles === null) return 0.35;
  if (miles <= 10) return 1;
  if (miles <= radiusMiles) return 0.94 - 0.29 * (miles / radiusMiles);
  if (miles <= radiusMiles * 2) return 0.20;
  return 0.08;
}

/**
 * Browser coordinates are only used inside this synchronous calculation.
 * We return the nearest coarse city anchor (not the coordinates).
 */
export function gravityCityFromCoordinates(lat: number, lon: number): string | null {
  if (!virginiaCoordinates(lat, lon)) return null;
  const closest = [...VIRGINIA_CITIES].sort(
    (a,b) => milesBetween(a, {lat,lon}) - milesBetween(b, {lat,lon})
  )[0];
  return closest?.id ?? null;
}
