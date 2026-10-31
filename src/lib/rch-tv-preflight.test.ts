import { describe, expect, it } from 'vitest';
import { formatRchTvDuration, rchTvPreflightQuality } from './rch-tv-preflight';
import { rchTvFileError, rchTvVideoMimeType } from './rch-tv-upload';

describe('RCH TV video preflight policy', () => {
  it('rejects unsupported iPhone MOV before uploading a multi-GB file', () => {
    expect(rchTvFileError({name:'game.mov',type:'video/quicktime',size:90*1024*1024})).toMatch(/Export as MP4/);
    expect(rchTvFileError({name:'game.MOV',type:'',size:90*1024*1024})).toMatch(/Export as MP4/);
    expect(rchTvFileError({name:'game.mp4',type:'video/mp4',size:90*1024*1024})).toBeNull();
    expect(rchTvVideoMimeType({name:'game.mp4',type:''})).toBe('video/mp4');
  });
  it('assesses duration, geometry, and readable metadata without claiming transcoding', () => {
    expect(rchTvPreflightQuality({durationSeconds:3600,width:1920,height:1080,aspectRatio:16/9})).toBeNull();
    expect(rchTvPreflightQuality({durationSeconds:Infinity,width:1920,height:1080,aspectRatio:16/9})).toMatch(/duration/);
    expect(rchTvPreflightQuality({durationSeconds:90,width:160,height:90,aspectRatio:16/9})).toMatch(/resolution/);
    expect(rchTvPreflightQuality({durationSeconds:90,width:1920,height:1080,aspectRatio:9})).toMatch(/shape/);
    expect(formatRchTvDuration(3723)).toBe('1:02:03');
    expect(formatRchTvDuration(125)).toBe('2:05');
  });
});
