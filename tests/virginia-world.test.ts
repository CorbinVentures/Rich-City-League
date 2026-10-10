import { describe, expect, it } from 'vitest';
import { cityForText, milesBetween, VIRGINIA_CITIES, virginiaCoordinates } from '../src/lib/virginia-world';

describe('Virginia map geographic anchors', () => {
  it('supplies statewide city gateways including Richmond and Virginia Beach', () => {
    expect(VIRGINIA_CITIES.find(c=>c.id==='richmond')).toMatchObject({name:'Richmond'});
    expect(VIRGINIA_CITIES.find(c=>c.id==='virginia-beach')).toMatchObject({name:'Virginia Beach'});
  });
  it('resolves cities mentioned in venue addresses but refuses unknown place names', () => {
    expect(cityForText('2803 Dupont Circle, Richmond, VA')?.id).toBe('richmond');
    expect(cityForText('Virginia Beach, Virginia')?.id).toBe('virginia-beach');
    expect(cityForText('Unknown Gym, Someplace')?.id).toBeUndefined();
  });
  it('does not accept missing or implausible Virginia coordinates', () => {
    expect(virginiaCoordinates(37.54,-77.44)).toBe(true);
    expect(virginiaCoordinates(null,-77.44)).toBe(false);
    expect(virginiaCoordinates(40.7,-73.9)).toBe(false);
  });
  it('computes near-zero distance for identical points', () => {
    expect(milesBetween({lat:37.54,lon:-77.44},{lat:37.54,lon:-77.44})).toBeCloseTo(0,5);
    expect(milesBetween({lat:37.54,lon:-77.44},{lat:36.85,lon:-76.28})).toBeGreaterThan(75);
  });
});
