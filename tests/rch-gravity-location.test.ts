import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRAVITY_LOCATION,
  gravityApproxCityMiles,
  gravityCityFromCoordinates,
  gravityLocalRelevance,
  normalizeGravityLocation,
  readGravityLocation,
} from '../src/lib/rch-gravity-location';
import { scoreGravityCandidate } from '../src/lib/rch-gravity';

describe('RCH Gravity privacy-first location intelligence', () => {
  it('defaults to Virginia statewide with no location preference', () => {
    expect(readGravityLocation()).toEqual(DEFAULT_GRAVITY_LOCATION);
    expect(gravityLocalRelevance(null,'Richmond')).toBe(0.35);
  });

  it('never accepts arbitrary locations, coordinates or unapproved radius values', () => {
    expect(normalizeGravityLocation({
      cityId:'123 Main Street',radiusMiles:1,source:'device',latitude:37.5,longitude:-77.4,
    })).toEqual(DEFAULT_GRAVITY_LOCATION);
    expect(normalizeGravityLocation({cityId:'richmond',radiusMiles:100,source:'manual'}))
      .toEqual({cityId:'richmond',radiusMiles:100,source:'manual'});
  });

  it('maps opted-in coordinates to a coarse city without returning GPS coordinates', () => {
    expect(gravityCityFromCoordinates(37.5407,-77.436)).toBe('richmond');
    expect(gravityCityFromCoordinates(40.7,-74.0)).toBe(null);
    expect(gravityCityFromCoordinates(Number.NaN,-77.4)).toBe(null);
  });

  it('understands nearby neighboring Virginia towns rather than exact text equality', () => {
    const richmond = gravityLocalRelevance('richmond','Richmond',50);
    const petersburg = gravityLocalRelevance('richmond','Petersburg',50);
    const norfolk = gravityLocalRelevance('richmond','Norfolk',50);
    expect(gravityApproxCityMiles('richmond','Petersburg')).toBeGreaterThan(10);
    expect(richmond).toBeGreaterThan(petersburg);
    expect(petersburg).toBeGreaterThan(norfolk);
  });

  it('honors the selected discovery radius as a ranking preference, not exclusion', () => {
    const narrow = gravityLocalRelevance('richmond','Charlottesville',25);
    const wide = gravityLocalRelevance('richmond','Charlottesville',100);
    expect(wide).toBeGreaterThan(narrow);
    expect(narrow).toBeGreaterThan(0);
    expect(gravityLocalRelevance('richmond','Unspecified, Virginia',25)).toBe(0.35);
  });

  it('blends location with goal relevance and keeps statewide content eligible', () => {
    const context = {cityId:'richmond',radiusMiles:50 as const,intent:'play' as const,now:Date.parse('2026-10-16T12:00:00Z')};
    const local = scoreGravityCandidate({id:'run-rva',category:'run',city:'Richmond',startsAt:'2026-10-17T12:00:00Z'},context);
    const distant = scoreGravityCandidate({id:'run-norfolk',category:'run',city:'Norfolk',startsAt:'2026-10-17T12:00:00Z'},context);
    expect(local.score).toBeGreaterThan(distant.score);
    expect(distant.score).toBeGreaterThan(0);
    expect(local.reasons).toContain('Around your selected city');
  });
});
