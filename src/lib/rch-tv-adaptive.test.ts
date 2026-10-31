import { describe,expect,it } from 'vitest';
import { cloudflareVideoUid,estimatedStreamMonthlyCost,isRchAdaptiveEmbedUrl,resolveRchAdaptiveEmbed,RCH_TV_ADAPTIVE_PREFIX } from './rch-tv-adaptive';
describe('RCH TV adaptive delivery safety and pricing',()=>{
  const uid='a'.repeat(32);
  it('only constructs an owned customer-domain iframe for valid video UIDs',()=>{
    const url=resolveRchAdaptiveEmbed(RCH_TV_ADAPTIVE_PREFIX+uid,'aBc123456');
    expect(url).toBe('https://customer-abc123456.cloudflarestream.com/'+uid+'/iframe');
    expect(isRchAdaptiveEmbedUrl(url!)).toBe(true);
    expect(resolveRchAdaptiveEmbed(RCH_TV_ADAPTIVE_PREFIX+uid,'')).toBeNull();
    expect(resolveRchAdaptiveEmbed(RCH_TV_ADAPTIVE_PREFIX+'../../foo','abc123456')).toBeNull();
    expect(resolveRchAdaptiveEmbed(RCH_TV_ADAPTIVE_PREFIX+uid,'abc.com/evil')).toBeNull();
    expect(cloudflareVideoUid('bad')).toBeNull();
    expect(isRchAdaptiveEmbedUrl('https://untrusted.example.com/'+uid+'/iframe')).toBe(false);
  });
  it('models prepaid storage and delivered minutes without treating revenue as profit',()=>{
    expect(estimatedStreamMonthlyCost(900,120000)).toEqual({storageUsd:5,deliveryUsd:120,totalUsd:125});
    expect(estimatedStreamMonthlyCost(-1,100)).toBeNull();
    expect(estimatedStreamMonthlyCost(2100,0)).toEqual({storageUsd:15,deliveryUsd:0,totalUsd:15});
  });
});
