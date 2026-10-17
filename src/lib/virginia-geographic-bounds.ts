/** Find the bounding rectangle of an official (possibly multipart) Census
 * 2026 Virginia county polygon. Do not substitute a guessed city radius. */
export type GeoBounds=[[number,number],[number,number]];
export function polygonBounds(feature:{geometry?:{type?:string;coordinates?:unknown}}|null|undefined):GeoBounds|null{
 if(!feature||!['Polygon','MultiPolygon'].includes(feature.geometry?.type||''))return null;
 let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
 function walk(value:unknown):void{
  if(!Array.isArray(value))return;
  if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number'){
   const lon=value[0],lat=value[1];
   if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<-84||lon>-74||lat<36||lat>40)return;
   west=Math.min(west,lon);south=Math.min(south,lat);east=Math.max(east,lon);north=Math.max(north,lat);
  }else for(const child of value)walk(child);
 }
 walk(feature.geometry?.coordinates);
 return Number.isFinite(west)&&east>west&&north>south?[[west,south],[east,north]]:null;
}
export function countyBounds(data:{features?:Array<{properties?:{GEOID?:string};geometry?:{type?:string;coordinates?:unknown}}>}|null,geoid:string):GeoBounds|null{
 return polygonBounds(data?.features?.find(f=>f.properties?.GEOID===geoid));
}
