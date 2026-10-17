import type {VirginiaCity} from '@/lib/virginia-world';
import type {WorldCourt,WorldRun} from '@/lib/runs-world-game';

/** The postal locality of a court is not necessarily its jurisdiction.
 * Pilot grouping: these three postal labels belong to our Chesterfield
 * discovery region, but Richmond's independent city is NEVER merged. */
export function localityNames(city:VirginiaCity):string[]{
 if(city.id==='chesterfield')return ['Chesterfield','North Chesterfield','South Chesterfield'];
 if(city.id==='henrico')return ['Henrico','Glen Allen','Sandston'];
 return [city.name];
}
export function matchesRunToCourts(run:WorldRun,slugs:ReadonlySet<string>){
 return Boolean(run.location_slug&&slugs.has(run.location_slug));
}
/** All metrics and cards must use these exact rows, not independently filtered
 * ad-hoc marker arrays. Coverage counts include parks missing a precise pin. */
export function courtCoverage(courts:readonly WorldCourt[],runs:readonly WorldRun[],pins:readonly {id:string}[]){
 const pinned=new Set(pins.map(p=>p.id.replace(/^court:/,'')));
 const slugs=new Set(courts.map(c=>c.slug));
 const matchedRuns=runs.filter(run=>matchesRunToCourts(run,slugs));
 return {total:courts.length,mapped:courts.filter(c=>pinned.has(c.slug)).length,
  needsCoordinates:courts.filter(c=>!pinned.has(c.slug)).length,
  scheduled:matchedRuns.length,orphanRuns:runs.length-matchedRuns.length};
}
export const REAL_VIRGINIA_MAP={
 provider:'OpenFreeMap / OpenStreetMap',
 boundaries:'U.S. Census Bureau TIGERweb 2026',
 style:'https://tiles.openfreemap.org/styles/dark',
 stateOutline:'/api/geo/virginia?layer=state',
 chesterfieldJurisdiction:'/api/geo/virginia?layer=counties',
} as const;
