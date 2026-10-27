import { describe, expect, it } from 'vitest';
import { RCH_TV_VIDEO_BUCKET, RCH_TV_VIDEO_STORAGE_PREFIX, resolveRchMediaUrl } from './rch-tv-media';
import { RCH_TV_VIDEO_MAX_BYTES, rchTvFileError, rchTvIsVideo, rchTvVideoMimeType } from './rch-tv-upload';

describe('RCH TV full-game upload compatibility', () => {
  const legacy = (path:string) => `https://storage.example/media/${path}`;
  const video = (path:string) => `https://storage.example/${RCH_TV_VIDEO_BUCKET}/${path}`;
  const uuid = 'b353fc44-629e-457b-a522-438ae62de918';
  const objectId = 'fc73f6dc-9d85-4dc2-8218-756d0e1b3d39';

  it('resolves new RCH TV videos without changing legacy social URLs', () => {
    expect(resolveRchMediaUrl(`legacy/video.mp4`,legacy,video)).toEqual(legacy('legacy/video.mp4'));
    const key = `${uuid}/rch-tv/${objectId}.mp4`;
    expect(resolveRchMediaUrl(RCH_TV_VIDEO_STORAGE_PREFIX + key,legacy,video)).toEqual(video(key));
    const movKey = `${uuid}/rch-tv/${objectId}.mov`;
    expect(resolveRchMediaUrl(RCH_TV_VIDEO_STORAGE_PREFIX + movKey,legacy,video)).toEqual(video(movKey));
  });
  it('rejects traversal and unexpected bucket/path schemes', () => {
    expect(resolveRchMediaUrl(RCH_TV_VIDEO_STORAGE_PREFIX + '../evil.mp4',legacy,video)).toBeNull();
    expect(resolveRchMediaUrl('javascript:alert(1)',legacy,video)).toBeNull();
    expect(resolveRchMediaUrl(RCH_TV_VIDEO_STORAGE_PREFIX + `${uuid}/rch-tv/clip.mp4`,legacy,video)).toBeNull();
    expect(resolveRchMediaUrl(RCH_TV_VIDEO_STORAGE_PREFIX + `${uuid}/rch-tv/${objectId}.mp4`,legacy)).toBeNull();
  });
  it('permits 108.6 MB and 5 GB videos without relaxing image/audio limits', () => {
    expect(rchTvIsVideo({type:'video/mp4'})).toBe(true);
    expect(rchTvFileError({type:'video/mp4',size:Math.ceil(108.6*1024*1024)})).toBeNull();
    expect(rchTvFileError({type:'video/mp4',size:RCH_TV_VIDEO_MAX_BYTES})).toBeNull();
    expect(rchTvFileError({type:'video/mp4',size:RCH_TV_VIDEO_MAX_BYTES+1})).toMatch(/5 GB/);
    expect(rchTvFileError({type:'image/png',size:51*1024*1024})).toMatch(/50 MB/);
    expect(rchTvVideoMimeType({name:'RVA-vs-DC-SnapYT.App.mov',type:'video/quicktime'})).toBe('video/quicktime');
    expect(rchTvVideoMimeType({name:'RVA-vs-DC-SnapYT.App.MOV',type:'video/x-quicktime'})).toBe('video/quicktime');
    expect(rchTvVideoMimeType({name:'RVA-vs-DC-SnapYT.App.mov',type:'application/octet-stream'})).toBe('video/quicktime');
    expect(rchTvVideoMimeType({name:'RVA-vs-DC-SnapYT.App.mov',type:''})).toBe('video/quicktime');
    expect(rchTvVideoMimeType({name:'RVA-vs-DC-SnapYT.App.mov',type:'video/mp4'})).toBe('video/quicktime');
    expect(rchTvIsVideo({name:'RVA-vs-DC-SnapYT.App.mov',type:'video/quicktime'})).toBe(true);
    expect(rchTvFileError({name:'RVA-vs-DC-SnapYT.App.mov',type:'video/quicktime',size:Math.ceil(72.6*1024*1024)})).toBeNull();
    expect(rchTvFileError({name:'RVA-vs-DC-SnapYT.App.MOV',type:'',size:Math.ceil(72.6*1024*1024)})).toBeNull();
    expect(rchTvFileError({name:'clip.mov',type:'video/quicktime',size:RCH_TV_VIDEO_MAX_BYTES+1})).toMatch(/5 GB/);
    expect(rchTvFileError({name:'not-really-a-video.mov',type:'image/jpeg',size:1000})).toMatch(/unexpected format/);
    expect(rchTvFileError({name:'photo.jpg',type:'video/quicktime',size:1000})).not.toBeNull();
  });
});