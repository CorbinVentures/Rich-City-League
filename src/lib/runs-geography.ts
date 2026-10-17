import type {VirginiaCity} from '@/lib/virginia-world';
import type {WorldCourt,WorldRun} from '@/lib/runs-world-game';

/** The postal locality of a court is not necessarily its jurisdiction.
 * Pilot grouping: these three postal labels belong to our Chesterfield
 * discovery region, but Richmond's independent city is NEVER merged. */
export function localityNames(city:VirginiaCity):string[]{
 if(city.id==='chesterfield')return ['Chesterfield','North Chesterfield','South Chesterfield'];
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
 style:'https://tiles.openfreemap.org/styles/dark',
 stateOutline:'https://services.arcgis.com/p5v98VHDX9Atv3l7/ArcGIS/rest/services/VDOTAdministrativeBoundaries/FeatureServer/0/query?where=1%3D1&outFields=STATEFP&outSR=4326&geometryPrecision=5&f=geojson',
 chesterfieldJurisdiction:'https://services.dwr.virginia.gov/arcgis/rest/services/WMA_Editing/WMA_VGIN_CountyBoundaries/FeatureServer/0/query?where=NAME%3D%27Chesterfield%27&outFields=NAME%2CSTCOFIPS&outSR=4326&geometryPrecision=5&f=geojson',
} as const;
