import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
const source = (path:string) => readFileSync(join(process.cwd(),path),'utf8');
describe('RCH TV recording boundaries',()=>{
  it('requires the verified admin role and refuses missing credentials',()=>{
    const route=source('src/app/api/rch-tv/recording/route.ts');
    expect(route).toContain("client.rpc('is_admin')");
    expect(route).toContain("await client.auth.getUser()");
    expect(route).toContain("config.state !== 'available'");
    expect(route).toContain("'Cache-Control': 'no-store, private'");
    expect(route).not.toContain('NEXT_PUBLIC_LIVEKIT');
  });
  it('prevents duplicate recordings and keeps output private',()=>{
    const service=source('src/lib/rch-tv-recording.ts');
    expect(service).toContain("listEgress({ roomName, active: true })");
    expect(service).toContain("active.length) throw");
    expect(service).toContain("forcePathStyle: true");
    expect(service).toContain("rch-tv-private/");
    expect(service).not.toContain("getPublicUrl");
  });
  it('keeps cloud recording opt-in and no auto-publishing',()=>{
    const producer=source('src/app/admin/rch-tv/studio/page.tsx');
    expect(producer).toContain('/api/rch-tv/recording');
    expect(producer).toContain('Recording is initializing');
    expect(producer).toContain('independent');
    expect(source('src/app/media/page.tsx')).toContain('No subscription required');
  });
});
