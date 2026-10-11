import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultRchTvBroadcast, parseRchTvBroadcast, RCH_TV_MODES, isRchTvMode } from '../src/lib/rch-tv-broadcast';

const read = (path: string) => readFileSync(join(process.cwd(),path),'utf8');

describe('RCH TV live production studio',()=>{
  it('uses two separated rooms for Live Games and The Pulse',()=>{
    expect(isRchTvMode('live_games')).toBe(true);
    expect(isRchTvMode('the_pulse')).toBe(true);
    expect(isRchTvMode('movies')).toBe(false);
    expect(RCH_TV_MODES.live_games.room).not.toBe(RCH_TV_MODES.the_pulse.room);
  });

  it('defaults to off air and clamps public overlay controls',()=>{
    const initial = defaultRchTvBroadcast('live_games');
    expect(initial.active).toBe(false);
    const parsed = parseRchTvBroadcast('live_games',{
      active:true,home:'A'.repeat(80),awayScore:99999,homeScore:-2,
      accent:'javascript:alert(1)',preset:'invalid',showSponsor:true,
      sponsor:'S'.repeat(120),
    });
    expect(parsed.active).toBe(true);
    expect(parsed.home).toHaveLength(22);
    expect(parsed.awayScore).toBe(999);
    expect(parsed.homeScore).toBe(0);
    expect(parsed.accent).toBe(initial.accent);
    expect(parsed.preset).toBe('broadcast');
    expect(parsed.sponsor).toHaveLength(80);
  });

  it('issues distinct server-only token grants and uses admin authentication',()=>{
    const api=read('src/app/api/rch-tv/token/route.ts');
    expect(api).toContain("process.env.LIVEKIT_API_SECRET");
    expect(api).toContain("supabase.auth.getUser()");
    expect(api).toContain("supabase.rpc('is_admin')");
    expect(api).toContain("canPublish: body.role === 'producer'");
    expect(api).toContain("canSubscribe: body.role === 'viewer'");
    expect(api).toContain("canPublishData: false");
    expect(api).toContain("parseRchTvBroadcast(body.mode, data?.value).active");
    expect(api).toContain("'Cache-Control': 'no-store, private'");
  });

  it('has real camera preview, scoreboard controls and on-air state',()=>{
    const studio=read('src/app/admin/rch-tv/studio/page.tsx');
    expect(studio).toContain('navigator.mediaDevices.getUserMedia');
    expect(studio).toContain("publishTrack(track");
    expect(studio).toContain("saveConfig(config,true,mode)");
    expect(studio).toContain("saveConfig(config,false,mode)");
    expect(studio).toContain('Camera / Canon capture input');
    expect(studio).toContain('Increase');
    expect(studio).toContain('Podcast title cards');
    expect(studio).toContain('Publish graphics');
    expect(studio).toContain('This version does not burn graphics');
  });

  it('connects both viewer channels to LiveKit with an offline fallback',()=>{
    const page=read('src/app/media/page.tsx');
    const viewer=read('src/components/media/RchLiveViewer.tsx');
    const overlay=read('src/components/media/RchBroadcastOverlay.tsx');
    expect(page).toContain('<RchLiveViewer mode="live_games" />');
    expect(page).toContain('<RchLiveViewer mode="the_pulse" />');
    expect(page).not.toContain('NEXT_PUBLIC_CLOUDFLARE_STREAM_LIVE_INPUT_ID');
    expect(viewer).toContain("role: 'viewer'");
    expect(viewer).toContain('TrackSubscribed');
    expect(viewer).toContain('Enable sound');
    expect(overlay).toContain('showScoreboard');
    expect(overlay).toContain('GUEST:');
    expect(overlay).toContain('PRESENTED BY');
    expect(existsSync(join(process.cwd(),'src/app/admin/rch-tv/studio/page.tsx'))).toBe(true);
  });
});
