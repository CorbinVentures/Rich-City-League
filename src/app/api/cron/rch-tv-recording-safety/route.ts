import { NextResponse } from 'next/server';
import { recordingConfig } from '@/lib/rch-tv-recording';
import { safetySweep } from '@/lib/rch-tv-recording-safety';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Safe only for Vercel Cron; no public invocation and no secrets in output. */
export async function GET(request: Request) {
  const bearer=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret=process.env.CRON_SECRET?.trim();
  const headers={'Cache-Control':'no-store, private'};
  if(!secret||bearer!==secret)return NextResponse.json({error:'Unauthorized'},{status:401,headers});
  if(recordingConfig(process.env).state!=='available')return NextResponse.json({state:'disabled',checked:0,stopped:0,verified:0},{headers});
  try{
    return NextResponse.json(await safetySweep(),{headers});
  }catch{
    console.error('[rch-tv] recording safety watchdog unavailable; operator must check LiveKit.');
    return NextResponse.json({error:'Safety sweep unavailable. Check LiveKit immediately.'},{status:503,headers});
  }
}
