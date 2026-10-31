import { rchTvFileError, rchTvIsVideo } from './rch-tv-upload';

/**
 * Checks local metadata only; it does NOT verify every codec, encode an MP4,
 * measure CDN streaming quality, or clear distribution rights.
 */
export type RchTvVideoPreflight = {
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: number;
};

export function formatRchTvDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Unknown duration';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return (hours > 0 ? String(hours) + ':' + String(minutes).padStart(2, '0') + ':' : String(minutes) + ':') + String(secs).padStart(2, '0');
}

export function rchTvPreflightQuality(result: RchTvVideoPreflight): string | null {
  if (!Number.isFinite(result.durationSeconds) || result.durationSeconds <= 0)
    return 'The recording duration could not be verified. Re-export the video before publishing.';
  if (result.width < 320 || result.height < 180)
    return 'Video resolution is too low for a reliable basketball broadcast replay.';
  if (result.aspectRatio < 0.5 || result.aspectRatio > 3.0)
    return 'The video shape is unusual. Review the recording before publishing.';
  return null;
}

export async function inspectRchTvVideo(file: File): Promise<RchTvVideoPreflight> {
  const invalid = rchTvFileError(file);
  if (invalid) throw new Error(invalid);
  if (!rchTvIsVideo(file)) throw new Error('Select an MP4 or WebM video.');
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  try {
    return await new Promise<RchTvVideoPreflight>((resolve, reject) => {
      let complete = false;
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener('loadedmetadata', loaded);
        video.removeEventListener('error', failed);
      };
      const finish = (error: Error | null, data?: RchTvVideoPreflight) => {
        if (complete) return;
        complete = true;
        cleanup();
        if (error) reject(error);
        else if (data) resolve(data);
      };
      const loaded = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const data = { durationSeconds: video.duration, width, height, aspectRatio: width / Math.max(height, 1) };
        const quality = rchTvPreflightQuality(data);
        finish(quality ? new Error(quality) : null, data);
      };
      const failed = () => finish(new Error('This browser could not inspect the recording. Export as H.264/AAC MP4 or save it as a draft for review.'));
      const timer = window.setTimeout(() => finish(new Error('Video inspection timed out. Try another MP4 export.')), 20000);
      video.addEventListener('loadedmetadata', loaded);
      video.addEventListener('error', failed);
      video.src = url;
      video.load();
    });
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
