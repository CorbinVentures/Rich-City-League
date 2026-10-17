import {NextRequest,NextResponse} from 'next/server';

/** Official Census TIGERweb (January 2026 vintage).  A same-origin,
 * server-validated source keeps map geometry consistent across the PWA,
 * Runs and Discover and avoids untrusted client-supplied GIS URLs. */
export const runtime='nodejs';
import {censusBoundaryUrl,validVirginiaFeatures} from '@/lib/virginia-census-boundaries';

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
