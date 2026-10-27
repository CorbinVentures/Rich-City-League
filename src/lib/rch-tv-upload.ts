import { RCH_TV_VIDEO_BUCKET, RCH_TV_VIDEO_STORAGE_PREFIX } from './rch-tv-media';

// First-party Supabase TUS upload in 6 MiB chunks, no external storage subscription.
export const RCH_TV_VIDEO_MAX_BYTES = 5 * 1024 * 1024 * 1024;
export const RCH_TV_SMALL_MAX_BYTES = 50 * 1024 * 1024;
const CHUNK_SIZE = 6 * 1024 * 1024;
const RETRY = [0, 3000, 5000, 10000, 20000];
const VIDEOS = new Set(['video/mp4', 'video/webm']);
const OTHERS = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav']);

export function rchTvFileError(file: Pick<File, 'type'|'size'>): string | null {
  if (!VIDEOS.has(file.type) && !OTHERS.has(file.type)) return 'Choose MP4, WebM, JPEG, PNG, WebP, MP3, M4A or WAV.';
  if (file.size < 1) return 'Choose a nonempty file.';
  if (VIDEOS.has(file.type) && file.size > RCH_TV_VIDEO_MAX_BYTES) return 'Videos must be 5 GB or smaller.';
  if (!VIDEOS.has(file.type) && file.size > RCH_TV_SMALL_MAX_BYTES) return 'Images and audio must be 50 MB or smaller.';
  return null;
}
export const rchTvIsVideo = (file: Pick<File,'type'>) => VIDEOS.has(file.type);

type Checkpoint = { path: string; url: string };
type Options = {
  file: File; userId: string; projectUrl: string;
  token: () => Promise<string>;
  signal: AbortSignal;
  progress: (percent: number) => void;
};
const checkpointKey = (userId: string, file: File) =>
  `rch-tv:tus:${userId}:${file.name}:${file.size}:${file.lastModified}`;

function endpointFor(projectUrl: string): string {
  const url = new URL(projectUrl);
  if (url.protocol !== 'https:') throw new Error('Secure storage URL required.');
  const host = url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.storage.supabase.co')
    ? url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co') : url.hostname;
  return `https://${host}/storage/v1/upload/resumable`;
}
function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Upload paused', 'AbortError'));
  return new Promise((resolve,reject) => {
    const onAbort = () => { clearTimeout(timer); reject(new DOMException('Upload paused','AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort',onAbort); resolve(); },ms);
    signal.addEventListener('abort',onAbort,{once:true});
  });
}

export async function uploadRchTvVideo({file,userId,projectUrl,token,signal,progress}:Options):Promise<{storagePath:string;objectPath:string}> {
  const invalid = rchTvFileError(file);
  if (invalid || !rchTvIsVideo(file)) throw new Error(invalid || 'Unsupported video file.');
  const endpoint = endpointFor(projectUrl);
  const origin = new URL(endpoint).origin;
  const key = checkpointKey(userId,file);
  let checkpoint:Checkpoint|null = null;
  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) as Checkpoint : null;
    if (parsed && typeof parsed.path === 'string' && typeof parsed.url === 'string'
        && parsed.path.startsWith(`${userId}/rch-tv/`) && new URL(parsed.url).origin === origin) checkpoint=parsed;
  } catch {}

  const headers = async () => ({ Authorization:`Bearer ${await token()}`, 'Tus-Resumable':'1.0.0' });
  const serverOffset = async (url:string):Promise<number|null> => {
    const response = await fetch(url,{method:'HEAD',headers:await headers(),signal});
    if (response.status===404 || response.status===410) return null;
    if (!response.ok) throw new Error(`Unable to resume upload (HTTP ${response.status}).`);
    const offset = Number(response.headers.get('Upload-Offset'));
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > file.size) throw new Error('Invalid storage upload offset.');
    return offset;
  };

  let offset:number|null = null;
  if (checkpoint) {
    offset=await serverOffset(checkpoint.url);
    if (offset===null) checkpoint=null;
  }
  if (!checkpoint) {
    const ext=file.type==='video/webm'?'webm':'mp4';
    const path=`${userId}/rch-tv/${crypto.randomUUID()}.${ext}`;
    const metadata=[
      ['bucketName',RCH_TV_VIDEO_BUCKET],['objectName',path],
      ['contentType',file.type],['cacheControl','3600'],
    ].map(([k,v])=>`${k} ${btoa(v)}`).join(',');
    const started=await fetch(endpoint,{
      method:'POST',headers:{...(await headers()),'Upload-Length':String(file.size),'Upload-Metadata':metadata},signal,
    });
    if (!started.ok) throw new Error(`Storage rejected the upload (HTTP ${started.status}). Check project-wide and bucket file limits.`);
    const location=started.headers.get('Location');
    if (!location) throw new Error('Storage did not return a resumable upload URL.');
    const target=new URL(location,endpoint);
    if (target.origin!==origin) throw new Error('Unexpected storage upload host.');
    checkpoint={path,url:target.toString()};
    offset=0;
    try {window.localStorage.setItem(key,JSON.stringify(checkpoint));} catch {}
  }

  let position=offset??0;
  progress(Math.round(position/file.size*100));
  while (position<file.size) {
    let successful=false;
    let previousError:unknown;
    for (let attempt=0;attempt<RETRY.length;attempt++) {
      if (signal.aborted) throw new DOMException('Upload paused','AbortError');
      if (attempt) await delay(RETRY[attempt],signal);
      try {
        const part=file.slice(position,Math.min(position+CHUNK_SIZE,file.size));
        const response=await fetch(checkpoint.url,{
          method:'PATCH',headers:{...(await headers()),'Content-Type':'application/offset+octet-stream','Upload-Offset':String(position)},
          body:part,signal,
        });
        if (!response.ok) throw new Error(`Video chunk rejected (HTTP ${response.status}).`);
        const reported=Number(response.headers.get('Upload-Offset'));
        position=Number.isSafeInteger(reported)&&reported>position?reported:position+part.size;
        if (position>file.size) throw new Error('Invalid storage upload progress.');
        progress(Math.round(position/file.size*100));
        successful=true;
        break;
      } catch(err) {
        if (signal.aborted) throw err;
        previousError=err;
        const actual=await serverOffset(checkpoint.url).catch(()=>null);
        if (actual!==null) {
          position=actual;
          if (position>=file.size) {progress(100);successful=true;break;}
        }
      }
    }
    if (!successful) throw new Error(`Upload interrupted. Re-select the same video to resume. ${String(previousError??'')}`);
  }
  // The checkpoint is removed after media DB insertion succeeds.
  return {storagePath:`${RCH_TV_VIDEO_STORAGE_PREFIX}${checkpoint.path}`,objectPath:checkpoint.path};
}
export function clearRchTvCheckpoint(userId:string,file:File):void {
  try {window.localStorage.removeItem(checkpointKey(userId,file));} catch {}
}