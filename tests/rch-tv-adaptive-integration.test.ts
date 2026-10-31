import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH TV adaptive delivery opt-in boundaries',()=>{
  it('only resolves Stream IDs using configured customer allowlist',()=>{
    const publicData=read('src/app/media/page.tsx');
    const resolver=read('src/lib/rch-tv-media.ts');
    const player=read('src/components/PublicDirectory.tsx');
    expect(publicData).toContain('NEXT_PUBLIC_RCH_TV_CF_CUSTOMER_CODE');
    expect(resolver).toContain('resolveRchAdaptiveEmbed');
    expect(player).toContain('isRchAdaptiveEmbedUrl');
    expect(player).toContain('<iframe src={item.url}');
    expect(read('next.config.js')).toContain('https://*.cloudflarestream.com');
  });
  it('keeps hosted title submissions draft-only and editor protected',()=>{
    const form=read('src/components/media/RchTvAdaptiveDraftForm.tsx');
    expect(form).toContain("profile?.role !== 'admin'");
    expect(form).toContain("status:'draft'");
    expect(form).toContain('!rights || !verified');
    expect(form).not.toContain("status:'published'");
    expect(form).toContain("from('media').insert");
  });
});
