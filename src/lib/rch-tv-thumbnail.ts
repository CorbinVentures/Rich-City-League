/** Generate RCH TV stills on the uploader's device, without a video-processing service. */
export function rchTvPosterTime(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(duration * 0.9, Math.min(8, Math.max(0.1, duration * 0.12)));
}

function waitFor(video: HTMLVideoElement, event: 'loadedmetadata' | 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); video.removeEventListener(event, ok); video.removeEventListener('error', bad); };
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error('The browser cannot decode this video for a thumbnail. Choose an image instead.')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Thumbnail extraction timed out. Choose an image instead.')); }, 20000);
    video.addEventListener(event, ok, {once:true}); video.addEventListener('error', bad, {once:true});
  });
}

export async function captureRchTvPoster(source: File | string): Promise<Blob> {
  const local = typeof source !== 'string';
  const url = local ? URL.createObjectURL(source) : source;
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  if (!local) video.crossOrigin = 'anonymous';
  try {
    const metadata = waitFor(video, 'loadedmetadata');
    video.src = url; video.load();
    await metadata;
    const target = rchTvPosterTime(video.duration);
    if (target > 0) {
      const seeked = waitFor(video, 'seeked');
      video.currentTime = target;
      await seeked;
    }
    if (video.readyState < 2) await waitFor(video, 'loadeddata');
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) throw new Error('No decoded frame. Choose a thumbnail image instead.');
    const canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image capture is not supported in this browser.');
    let sx=0,sy=0,sw=w,sh=h;
    if (w/h > 16/9) { sw=h*16/9; sx=(w-sw)/2; }
    else { sh=w*9/16; sy=(h-sh)/2; }
    ctx.drawImage(video,sx,sy,sw,sh,0,0,960,540);
    return await new Promise<Blob>((resolve,reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create thumbnail JPEG. Choose an image instead.')), 'image/jpeg', 0.78));
  } finally {
    video.pause(); video.removeAttribute('src'); video.load();
    if (local) URL.revokeObjectURL(url);
  }
}

export function validateRchTvPosterImage(file: File): string | null {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Use JPEG, PNG or WebP for the thumbnail.';
  if (file.size < 1 || file.size > 3*1024*1024) return 'Thumbnail images must be 3 MB or less.';
  return null;
}
