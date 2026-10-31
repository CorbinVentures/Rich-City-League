import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
const read = (path:string) => readFileSync(join(process.cwd(),path),'utf8');

describe('RCH TV live-to-replay integrity', () => {
  it('does not claim browser broadcasting automatically archives games', () => {
    const studio=read('src/app/admin/rch-tv/studio/page.tsx');
    expect(studio).toContain('independent recording plan');
    expect(studio).toContain('!rightsCleared || !backupReady');
    expect(studio).toContain('Replay handoff');
    expect(studio).toContain('/admin/rch-tv?replay=');
    expect(studio).toContain('cloud recording files are not automatically published');
  });
  it('checks local video before publishing and keeps the archive public', () => {
    const upload=read('src/app/admin/rch-tv/page.tsx');
    expect(upload).toContain('inspectRchTvVideo(file)');
    expect(upload).toContain('videoInspection.status');
    expect(upload).toContain('videoInspection.status !== \'ready\'');
    expect(upload).toContain('id="upload-replay"');
    expect(read('src/app/media/page.tsx')).toContain('No subscription required');
  });
  it('has retry paths for video playback problems', () => {
    const player=read('src/components/PublicDirectory.tsx');
    expect(player).toContain('onStalled');
    expect(player).toContain('onError');
    expect(player).toContain('Retry playback');
    expect(player).toContain('Open original video file');
  });
});
