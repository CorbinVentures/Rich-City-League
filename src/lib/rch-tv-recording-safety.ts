import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { RoomServiceClient } from 'livekit-server-sdk';
import { getSupabaseAdminClient } from './supabase-admin';
import { RCH_TV_MODES, type RchTvMode } from './rch-tv-broadcast';
import { client, getRchRecordingStatus, listRchEgress, recordingConfig, startRchRecording, stopRchRecording } from './rch-tv-recording';

export type SafetySettings = { ready: boolean; maxMinutes: number; dailyMinutes: number };
export type RecordedSession = {
  id: string; channel: RchTvMode; state: string; egress_id: string | null; output_path: string | null;
  started_at: string; deadline_at: string; stopped_at: string | null; verified_at: string | null;
  file_size_bytes: number | null; note: string | null;
};
const OPEN = ['reserved','starting','active','stopping'];
const POLL = ['reserved','starting','active','stopping','finalizing'];
const ERROR_GENERIC = 'Recording safety service is unavailable. Recording has not been started.';
function dbOrFail() {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error(ERROR_GENERIC);
  return db;
}
function validMinutes(v: string | undefined, max: number) {
  if (!v || !/^[1-9]\d*$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n <= max ? n : null;
}
export function safetySettings(env: Record<string,string|undefined> = process.env): SafetySettings {
  const cap = validMinutes(env.RCH_TV_RECORDING_MAX_MINUTES, 180);
  const daily = validMinutes(env.RCH_TV_RECORDING_DAILY_CAP_MINUTES, 600);
  return { ready: cap !== null && daily !== null && daily >= cap,
    maxMinutes: cap ?? 0, dailyMinutes: daily ?? 0 };
}
function safeRow(row: any): RecordedSession {
  return { id: row.id, channel: row.channel, state: row.state, egress_id: row.egress_id,
    output_path: null, started_at: row.started_at, deadline_at: row.deadline_at, stopped_at: row.stopped_at,
    verified_at: row.verified_at, file_size_bytes: row.file_size_bytes, note: row.note };
}
async function mark(id: string, updates: Record<string, unknown>) {
  const { error } = await dbOrFail().from('rch_tv_recordings').update(updates).eq('id', id);
  if (error) throw new Error('Unable to persist recording status.');
}
async function findOpen(channel?: RchTvMode) {
  const db = dbOrFail();
  let query = db.from('rch_tv_recordings').select('*').in('state', OPEN).order('started_at', {ascending:false}).limit(1);
  if (channel) query = query.eq('channel', channel);
  const { data, error } = await query;
  if (error) throw new Error(ERROR_GENERIC);
  return data?.[0] ?? null;
}
export async function recordingDashboard(mode: RchTvMode) {
  const config = recordingConfig(process.env);
  const settings = safetySettings();
  const db = dbOrFail();
  const { data, error } = await db.from('rch_tv_recordings')
    .select('id,channel,state,egress_id,output_path,started_at,deadline_at,stopped_at,verified_at,file_size_bytes,note')
    .eq('channel',mode).order('started_at',{ascending:false}).limit(15);
  if (error) throw new Error('Recording history is not available.');
  const provider = await getRchRecordingStatus(mode, config);
  const activeSession = (data || []).find((row:any)=>OPEN.includes(row.state)) ?? null;
  // If a provider recording exists without a matching ledger row, fail closed.
  return { ...provider, state: config.state === 'available' && !settings.ready ? 'misconfigured' : provider.state, safetyReady: config.state === 'disabled' || settings.ready,
    maxMinutes: settings.maxMinutes, dailyMinutes: settings.dailyMinutes,
    active: provider.active || !!activeSession,
    egressId: provider.egressId ?? activeSession?.egress_id ?? null,
    history: (data || []).map(safeRow) };
}

export async function startSafeRecording(mode: RchTvMode, owner: string) {
  const settings = safetySettings();
  if (!settings.ready || recordingConfig(process.env).state !== 'available') throw new Error(ERROR_GENERIC);
  const db = dbOrFail();
  const provider = await getRchRecordingStatus(mode);
  if (provider.active) throw new Error('A provider recording is already running.');
  const { data: open, error: openError } = await db.from('rch_tv_recordings').select('id').in('state',OPEN).limit(1);
  if (openError || open?.length) throw new Error('A recording is already reserved or active.');
  const today = new Date().toISOString().slice(0,10) + 'T00:00:00.000Z';
  const {data: day, error: dailyError} = await db.from('rch_tv_recordings')
    .select('state,deadline_at,started_at').gte('started_at',today);
  if (dailyError) throw new Error(ERROR_GENERIC);
  const reserved = (day||[]).filter((row:any)=>row.state!=='failed')
    .reduce((sum:number,row:any)=>sum+Math.max(1,Math.ceil((new Date(row.deadline_at).getTime()-new Date(row.started_at).getTime())/60000)),0);
  if (reserved+settings.maxMinutes > settings.dailyMinutes)
    throw new Error('Daily recording-minute budget reached. No new recorder started.');
  const deadlineAt = new Date(Date.now()+settings.maxMinutes*60000).toISOString();
  const {data: reservation,error: reserveError} = await db.from('rch_tv_recordings').insert({
    channel:mode, created_by:owner, state:'reserved',deadline_at:deadlineAt,
    note:'Reserved for controlled, time-limited cloud recording',
  }).select('id').single();
  if (reserveError || !reservation) throw new Error('Another recording reserved the production slot.');
  try {
    const started = await startRchRecording(mode);
    try {
      await mark(reservation.id,{state:'starting',egress_id:started.egressId,output_path:started.outputPath,
        note:'Provider started. Confirm picture, audio and backup before relying on this recording.'});
    } catch {
      await stopRchRecording(mode).catch(()=>undefined);
      throw new Error('Failed to record Egress ID. Emergency stop attempted; verify provider dashboard.');
    }
    return { state:'starting',egressId:started.egressId, deadlineAt,
      note:'Recording is initializing. Provider costs are limited by deadline sweeps, not a guaranteed hard provider cap.' };
  } catch {
    // An ambiguous provider timeout could have started a billable recording.
    // Keep the reservation until an operator or watchdog reconciles it.
    await mark(reservation.id,{note:'Recording start uncertain. Check LiveKit; safety watchdog will reconcile.'}).catch(()=>undefined);
    throw new Error('Recording start could not be confirmed. Check LiveKit before retrying.');
  }
}
export async function stopSafeRecording(mode: RchTvMode) {
  const row = await findOpen(mode);
  const stopped = await stopRchRecording(mode);
  if (row) await mark(row.id,{state:'finalizing',stopped_at:new Date().toISOString(),
    note:stopped.state==='finalizing' ? 'Egress stop acknowledged. Waiting for completed file and private storage check.' : 'No provider Egress found. Review output manually.'});
  return {state:stopped.state,egressId:stopped.egressId};
}

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const hmac=(k:Buffer|string,s:string)=>createHmac('sha256',k).update(s).digest();
export async function verifyPrivateObject(path:string):Promise<number|null> {
  const cfg = recordingConfig(process.env);
  if(cfg.state!=='available'||!cfg.s3) return null;
  if(!/^rch-tv-private\/(?:live_games|the_pulse)\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}\.mp4$/i.test(path))return null;
  const u=new URL(cfg.s3.endpoint);
  if(u.search||u.hash||u.username||u.password)return null;
  const canonicalPath=(u.pathname.replace(/\/$/,'')+'/'+[cfg.s3.bucket,...path.split('/')].map(encodeURIComponent).join('/')).replace(/\/+/g,'/');
  const full=new URL(u.origin+canonicalPath);
  const stamp=new Date().toISOString().replace(/[:-]|\.\d{3}/g,'');
  const date=stamp.slice(0,8);
  const payload=sha('');
  const headers='host:'+full.host+'\n'+'x-amz-content-sha256:'+payload+'\n'+'x-amz-date:'+stamp+'\n';
  const signed='host;x-amz-content-sha256;x-amz-date';
  const scope=date+'/'+cfg.s3.region+'/s3/aws4_request';
  const canonical=['HEAD',canonicalPath,'',headers,signed,payload].join('\n');
  const stringToSign=['AWS4-HMAC-SHA256',stamp,scope,sha(canonical)].join('\n');
  const signingKey=hmac(hmac(hmac(hmac('AWS4'+cfg.s3.secret,date),cfg.s3.region),'s3'),'aws4_request');
  const sig=hmac(signingKey,stringToSign).toString('hex');
  try{
    const response=await fetch(full.toString(),{method:'HEAD',headers:{
      'x-amz-date':stamp,'x-amz-content-sha256':payload,
      Authorization:'AWS4-HMAC-SHA256 Credential='+cfg.s3.accessKey+'/'+scope+',SignedHeaders='+signed+',Signature='+sig,
    },signal:AbortSignal.timeout(9000),cache:'no-store'});
    const bytes=Number(response.headers.get('content-length'));
    return response.ok && Number.isSafeInteger(bytes) && bytes>0 ? bytes : null;
  }catch{return null;}
}

export async function safetySweep(now=new Date()) {
  if(recordingConfig(process.env).state!=='available')return {state:'disabled',checked:0,stopped:0,verified:0};
  if(!safetySettings().ready)throw new Error('Safety limits missing; recording is not permitted.');
  const db=dbOrFail();
  const {data,error}=await db.from('rch_tv_recordings').select('*').in('state',POLL).order('started_at',{ascending:true}).limit(30);
  if(error)throw new Error('Unable to load recording deadlines.');
  let stopped=0,verified=0;
  for(const row of data||[]){
    const active=OPEN.includes(row.state);
    if(active){
      const deadlinePassed=now.getTime()>=new Date(row.deadline_at).getTime();
      const staleReserve=row.state==='reserved' && now.getTime()-new Date(row.started_at).getTime()>5*60000;
      if(!deadlinePassed && !staleReserve)continue;
      try{
        const provider=await getRchRecordingStatus(row.channel);
        if(provider.active) {
          await stopRchRecording(row.channel);
          stopped++;
          await mark(row.id,{state:'finalizing',stopped_at:now.toISOString(),
            note:'Safety watchdog stopped Egress after deadline or stalled reservation. Verify file.'});
        }else {
          await mark(row.id,{state:'needs_review',stopped_at:now.toISOString(),
            note:'Safety sweep found no active Egress. Confirm recording in provider dashboard.'});
        }
      }catch{
        await mark(row.id,{note:'Recording stop failed. Operator must use LiveKit emergency controls.'}).catch(()=>undefined);
      }
      continue;
    }
    if(row.state!=='finalizing'||!row.egress_id||!row.output_path)continue;
    try{
      const provider=(await listRchEgress(row.channel)).find((x:any)=>x.egressId===row.egress_id);
      if(provider && Number(provider.status)===3){
        const file=(provider.fileResults||[])[0];
        const claimed=Number(file?.size??0);
        if(claimed>0){
          const actual=await verifyPrivateObject(row.output_path);
          if(actual!==null){
            await mark(row.id,{state:'verified',verified_at:now.toISOString(),file_size_bytes:actual,
              note:'Private object HEAD confirmed a nonempty file. Human playback and rights review still required.'});
            verified++;
            continue;
          }
        }
      }
      if(provider && [4,5,6].includes(Number(provider.status))) {
        await mark(row.id,{state:'needs_review',note:'Provider reported unsuccessful or duration-limited output. Do not publish.'});
      }else if(now.getTime()-new Date(row.stopped_at||row.started_at).getTime()>60*60000) {
        await mark(row.id,{state:'needs_review',note:'Output not independently verified within an hour. Investigate storage and provider.'});
      }
    }catch{ /* Retain finalizing for next sweep; never mark verified without an object. */ }
  }
  return {state:'ok',checked:(data||[]).length,stopped,verified};
}
export async function emergencyShutdown(mode:RchTvMode) {
  const db=dbOrFail();
  const cfg=recordingConfig(process.env);
  let stopped=false;
  let closed=false;
  if(cfg.state==='available'){
    try{await stopSafeRecording(mode);stopped=true;}catch{ /* continue closing broadcast */ }
  }
  if(cfg.apiUrl&&cfg.apiKey&&cfg.apiSecret){
    const room=new RoomServiceClient(cfg.apiUrl,cfg.apiKey,cfg.apiSecret);
    try{await room.deleteRoom(RCH_TV_MODES[mode].room);closed=true;}catch{ /* room may already be gone */ }
  }else{
    // LiveKit credentials can be available even if cloud recording is disabled.
    const liveUrl=process.env.LIVEKIT_URL?.trim(),key=process.env.LIVEKIT_API_KEY?.trim(),secret=process.env.LIVEKIT_API_SECRET?.trim();
    if(liveUrl&&key&&secret&&liveUrl.startsWith('wss://')){
      try{await new RoomServiceClient(liveUrl.replace(/^wss:/,'https:'),key,secret).deleteRoom(RCH_TV_MODES[mode].room);closed=true;}catch{}
    }
  }
  const key=RCH_TV_MODES[mode].key;
  const {data,currentError}=await db.from('site_settings').select('value').eq('key',key).maybeSingle()
    .then(({data,error}:any)=>({data,currentError:error}));
  if(currentError)throw new Error('Unable to read broadcast visibility state.');
  const value=data?.value && typeof data.value==='object'&&!Array.isArray(data.value) ? data.value : {};
  const {error}=await db.from('site_settings').upsert({key,value:{...value,active:false}},{onConflict:'key'});
  if(error)throw new Error('Unable to take channel offline.');
  return {state:'offline',recordingStopAcknowledged:stopped,roomClosed:closed,
    note:stopped&&closed?'LiveKit room closed and cloud recorder stop requested. Verify final file and backup.':
      'Channel marked offline, but provider shutdown could not be fully confirmed. Check LiveKit immediately.'};
}
