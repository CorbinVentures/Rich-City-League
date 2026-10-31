import { VIRGINIA_CITIES } from '../virginia-world';

type Consent = { profile_id: string; city_id: string };
export type VisibleMarket = { cityId: string; city: string; members: number };

/** Suppress city cohorts with fewer than three independently consenting members. */
export function groupSharedCities(consents: Consent[], eligibleMembers: Set<string>, minimum = 3) {
  const cities = new Map<string, number>();
  for (const item of consents) {
    if (!eligibleMembers.has(item.profile_id) || !VIRGINIA_CITIES.some(city => city.id === item.city_id)) continue;
    cities.set(item.city_id, (cities.get(item.city_id) ?? 0) + 1);
  }
  const visible = [...cities.entries()].filter(([,count])=>count>=minimum)
    .map(([cityId,members])=>({cityId,city:VIRGINIA_CITIES.find(city=>city.id===cityId)?.name??cityId,members}))
    .sort((a,b)=>b.members-a.members);
  return {visible, hiddenGroupCount:[...cities.values()].filter(n=>n<minimum).length};
}
