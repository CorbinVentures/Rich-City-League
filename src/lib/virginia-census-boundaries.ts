/** Official 2026 Census geographic data validation, shared by the Next.js route and QA tests. */
const ENDPOINT='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer';
const CONFIG={
 state:{layer:0,where:"GEOID='51'",max:1},
 counties:{layer:1,where:"STATE='51'",max:140}
} as const;

export function censusBoundaryUrl(layer:'state'|'counties'):string{
 const x=CONFIG[layer];
 const q=new URLSearchParams({where:x.where,outFields:'GEOID,NAME,STATE,COUNTY',outSR:'4326',geometryPrecision:'5',f:'geojson'});
 return ENDPOINT+'/'+x.layer+'/query?'+q.toString();
}
function isRingGeometry(g:any):boolean{
 return g&&['Polygon','MultiPolygon'].includes(g.type)&&Array.isArray(g.coordinates)&&g.coordinates.length>0;
}
export function validVirginiaFeatures(raw:any,layer:'state'|'counties'){
 if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))return null;
 const limit=CONFIG[layer].max;
 if(raw.features.length<1||raw.features.length>limit)return null;
 const features=raw.features.filter((f:any)=>f?.type==='Feature'&&isRingGeometry(f.geometry)&&
  typeof f.properties?.GEOID==='string'&&/^51\d{0,3}$/.test(f.properties.GEOID)&&
  (layer==='state'?f.properties.GEOID==='51':f.properties.GEOID.length===5));
 if(features.length!==raw.features.length||layer==='state'&&features.length!==1)return null;
 return {type:'FeatureCollection',features};
}
