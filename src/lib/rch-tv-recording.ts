import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';
import { RCH_TV_MODES, type RchTvMode } from './rch-tv-broadcast';

export type RchRecordingAvailability = 'disabled' | 'misconfigured' | 'available';
type RecordingConfig = {
  state: RchRecordingAvailability;
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  s3?: { endpoint: string; region: string; bucket: string; accessKey: string; secret: string };
};

/** Fail closed: no paid Egress call unless the flag and all required values are set. */
export function recordingConfig(env: Record<string, string | undefined>): RecordingConfig {
  if (env.RCH_TV_RECORDING_ENABLED !== 'true') return { state: 'disabled' };
  try {
    const url = new URL(env.LIVEKIT_URL || '');
    const endpoint = new URL(env.RCH_TV_RECORDING_S3_ENDPOINT || '');
    const apiKey = env.LIVEKIT_API_KEY?.trim();
    const apiSecret = env.LIVEKIT_API_SECRET?.trim();
    const bucket = env.RCH_TV_RECORDING_S3_BUCKET?.trim();
    const region = env.RCH_TV_RECORDING_S3_REGION?.trim();
    const accessKey = env.RCH_TV_RECORDING_S3_ACCESS_KEY?.trim();
    const secret = env.RCH_TV_RECORDING_S3_SECRET_KEY?.trim();
    if (url.protocol !== 'wss:' || url.username || url.password || !apiKey || !apiSecret ||
        endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
        !bucket || !region || !accessKey || !secret)
      return { state: 'misconfigured' };
    return {
      state: 'available', apiUrl: url.origin.replace(/^wss:/, 'https:'),
      apiKey, apiSecret, s3: { endpoint: endpoint.toString(), region, bucket, accessKey, secret },
    };
  } catch {
    return { state: 'misconfigured' };
  }
}

function client(config: RecordingConfig): EgressClient {
  if (!config.apiUrl || !config.apiKey || !config.apiSecret) throw new Error('LiveKit recording service not configured.');
  return new EgressClient(config.apiUrl, config.apiKey, config.apiSecret);
}
function assertReady(config: RecordingConfig): asserts config is RecordingConfig & { s3: NonNullable<RecordingConfig['s3']> } {
  if (config.state !== 'available' || !config.s3) throw new Error('Cloud recording has not been enabled and verified.');
}

export async function getRchRecordingStatus(mode: RchTvMode, config = recordingConfig(process.env)) {
  if (config.state !== 'available') return { state: config.state, active: false, egressId: null as string | null };
  const active = await client(config).listEgress({ roomName: RCH_TV_MODES[mode].room, active: true });
  return { state: config.state, active: active.length > 0, egressId: active[0]?.egressId ?? null };
}

export async function startRchRecording(mode: RchTvMode, config = recordingConfig(process.env)) {
  assertReady(config);
  const service = client(config);
  const roomName = RCH_TV_MODES[mode].room;
  const active = await service.listEgress({ roomName, active: true });
  // A second producer must never silently create a second billable recording.
  if (active.length) throw new Error('This channel already has a recording. Check recording status before going live.');
  const path = 'rch-tv-private/' + mode + '/' + new Date().toISOString().slice(0, 10) + '/' + randomUUID() + '.mp4';
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: path,
    output: { case: 's3', value: new S3Upload({
      bucket: config.s3.bucket, region: config.s3.region, endpoint: config.s3.endpoint,
      accessKey: config.s3.accessKey, secret: config.s3.secret, forcePathStyle: true,
    }) },
  });
  const started = await service.startRoomCompositeEgress(roomName, output, { layout: 'speaker' });
  return { egressId: started.egressId, state: 'starting',
    note: 'Recording is initializing. Confirm Egress state in LiveKit before relying on the file.' };
}

export async function stopRchRecording(mode: RchTvMode, config = recordingConfig(process.env)) {
  assertReady(config);
  const service = client(config);
  const active = await service.listEgress({ roomName: RCH_TV_MODES[mode].room, active: true });
  if (!active.length) return { state: 'not-recording', egressId: null as string | null };
  const recording = active[0];
  await service.stopEgress(recording.egressId);
  return { state: 'finalizing', egressId: recording.egressId };
}
