import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rchMediaKind, resolveRchMediaUrl } from '../src/lib/rch-tv-media';

const source=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH TV publishing and playback',()=>{
  it('turns bucket-relative uploads into usable public URLs',()=>{
    const getPublic=(p:string)=>`https://cdn.example.test/storage/v1/object/public/media/${p}`;
    expect(resolveRchMediaUrl('user-id/teams/team-id/highlight.mp4',getPublic))
      .toBe('https://cdn.example.test/storage/v1/object/public/media/user-id/teams/team-id/highlight.mp4');
    expect(resolveRchMediaUrl(' https://cdn.example.test/demo.mp4 ',getPublic)).toBe('https://cdn.example.test/demo.mp4');
    expect(resolveRchMediaUrl('javascript:alert(1)',getPublic)).toBeNull();
    expect(resolveRchMediaUrl('../private/clip.mp4',getPublic)).toBeNull();
    expect(resolveRchMediaUrl(' ',getPublic)).toBeNull();
  });

  it('distinguishes video, image and audio formats before rendering',()=>{
    expect(rchMediaKind('video')).toBe('video');
    expect(rchMediaKind('video/mp4')).toBe('video');
    expect(rchMediaKind('image')).toBe('image');
    expect(rchMediaKind('audio/mpeg')).toBe('audio');
    expect(rchMediaKind(null)).toBe('file');
  });

  it('uses playable media rather than presenting all uploads as pictures',()=>{
    const archive=source('src/components/PublicDirectory.tsx');
    expect(archive).toContain("kind === 'video'");
    expect(archive).toContain('<video src={item.url} controls');
    expect(archive).toContain('<audio src={item.url} controls');
    expect(archive).toContain('loading="lazy"');
    expect(source('src/app/media/page.tsx')).toContain('resolveRchMediaUrl(');
  });

  it('provides a protected admin studio with routes for creator and rights review',()=>{
    const page=source('src/app/admin/rch-tv/page.tsx');
    expect(existsSync(join(process.cwd(),'src/app/admin/rch-tv/page.tsx'))).toBe(true);
    expect(page).toContain("profile?.role === 'admin'");
    expect(page).toContain("organization_type','creator'");
    expect(page).toContain("from('rch_tv_acquisitions')");
    expect(page).toContain("from('media').insert(");
    expect(page).toContain("status:publishNow ? 'published' : 'draft'");
    expect(page).toContain("href=\"/admin/rch-tv/acquisition\"");
    expect(page).toContain("href=\"/admin/basketball-os\"");
    expect(source('src/components/AdminWorkspace.tsx')).toContain("href: '/admin/rch-tv'");
  });

  it('never falsely describes pending creator applications as automatic publishing permission',()=>{
    const form=source('src/components/media/CreatorInterestForm.tsx');
    expect(form).toContain("source:'partner-application'");
    expect(form).toContain("organization_type:'creator'");
    const studio=source('src/app/admin/rch-tv/page.tsx');
    expect(studio).toContain('not automatic publishing access');
  });
});
