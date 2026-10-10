import { type GeoPosition } from './virginia-world';

export type AtlasCamera = {focusX:number; focusY:number; zoom:number; panX:number; panY:number};
export const ATLAS_OVERVIEW:AtlasCamera={focusX:0.5,focusY:0.5,zoom:1,panX:0,panY:0};
export const ATLAS_MAX_ZOOM=12;
export function clampAtlasZoom(value:number) {
  if(!Number.isFinite(value))return 1;
  return Math.max(1,Math.min(ATLAS_MAX_ZOOM,value));
}
/** Same linear projection as public/virginia-world-fallback.svg, not a street-level basemap. */
export function atlasXY({lat,lon}:GeoPosition) {
  return {x:Math.max(0,Math.min(1,(lon+84.15)/9.7)),y:Math.max(0,Math.min(1,(39.75-lat)/3.6))};
}
export function atlasCityCamera(city:GeoPosition):AtlasCamera {
  const {x,y}=atlasXY(city);
  return {focusX:x,focusY:y,zoom:7,panX:0,panY:0};
}
export function atlasVenueCamera(venue:GeoPosition):AtlasCamera {
  const {x,y}=atlasXY(venue);
  return {focusX:x,focusY:y,zoom:9,panX:0,panY:0};
}
