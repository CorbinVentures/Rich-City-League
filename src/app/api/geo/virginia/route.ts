import {NextRequest,NextResponse} from 'next/server';

/** Official Census TIGERweb (January 2026 vintage).  A same-origin,
 * server-validated source keeps map geometry consistent across the PWA,
 * Runs and Discover and avoids untrusted client-supplied GIS URLs. */
export const runtime='nodejs';
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
export async function GET(req:NextRequest){
 const value=req.nextUrl.searchParams.get('layer');
 if(value!=='state'&&value!=='counties')
  return NextResponse.json({error:'Unsupported geographic layer'},{status:400});
 try{
  const response=await fetch(censusBoundaryUrl(value),{next:{revalidate:86400},
   signal:AbortSignal.timeout(13000),headers:{Accept:'application/geo+json,application/json'}});
  if(!response.ok)return NextResponse.json({error:'Official geographic source unavailable'},{status:502});
  const contentLength=Number(response.headers.get('content-length')||0);
  if(contentLength>12000000)return NextResponse.json({error:'Boundary dataset too large'},{status:502});
  const data=await response.text();
  if(data.length>12000000)return NextResponse.json({error:'Boundary dataset too large'},{status:502});
  const parsed=validVirginiaFeatures(JSON.parse(data),value);
  if(!parsed)return NextResponse.json({error:'Unexpected or incomplete government boundary data'},{status:502});
  return NextResponse.json(parsed,{headers:{
   'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800',
   'X-RCH-Geo-Source':'U.S. Census TIGERweb 2026'
  }});
 }catch{
  return NextResponse.json({error:'Virginia boundaries temporarily unavailable'},{status:503});
 }
}
