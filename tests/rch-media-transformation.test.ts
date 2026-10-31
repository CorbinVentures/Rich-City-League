import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRchMediaOffer, RCH_MEDIA_OFFERS } from '../src/lib/rch-media-offers';

const file = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('RCH Media Transformation V1', () => {
  it('offers only proposals and does not silently convert leads into paid subscriptions', () => {
    expect(RCH_MEDIA_OFFERS).toHaveLength(4);
    expect(new Set(RCH_MEDIA_OFFERS.map(x => x.code)).size).toBe(4);
    expect(RCH_MEDIA_OFFERS.some(x => x.type === 'production')).toBe(true);
    expect(RCH_MEDIA_OFFERS.some(x => x.type === 'sponsorship')).toBe(true);
    expect(getRchMediaOffer('random-injected-value')).toBeNull();
    for (const offer of RCH_MEDIA_OFFERS) {
      expect(offer.label).toContain('Starting at');
      expect(offer.includes.length).toBeGreaterThan(0);
    }
  });

  it('routes commercial leads through the existing controlled inquiry pipeline', () => {
    const form = file('src/components/media/RchMediaInterestForm.tsx');
    expect(form).toContain("from('network_partner_inquiries').insert");
    expect(form).toContain("source: 'partner-application'");
    expect(form).toContain("status: 'new'");
    expect(form).toContain("organization_type: offer.type === 'sponsorship' ? 'business' : 'media'");
    expect(form).toContain("RCH MEDIA / STUDIOS COMMERCIAL INQUIRY");
    expect(form).toContain('!form.consent || !form.rights');
    expect(form).not.toContain('service_role');
    const admin = file('src/app/admin/rch-tv/page.tsx');
    expect(admin).toContain('/admin/network/acquisition');
  });

  it('features real archives before an off-air live window and does not infer broadcasts from fixtures', () => {
    const page = file('src/app/media/page.tsx');
    expect(page).toContain('Available to watch now');
    expect(page.indexOf('rch-tv-archives-heading')).toBeLessThan(page.indexOf('id="live-games"'));
    expect(page).toContain('gameReplays.length>0');
    expect(page).toContain('League fixtures do not automatically indicate');
    expect(page).not.toContain('getLeagueSnapshot');
    expect(page).toContain('/media/studios');
    expect(page).toContain('No subscription required');
    expect(page).toContain('placement="media-feature"');
  });

  it('does not pretend film rights or creator payouts are already cleared', () => {
    const page = file('src/app/media/page.tsx');
    expect(page).toContain('Only confirmed, licensed titles');
    expect(page).toContain('not guaranteed or automatically payable');
    const admin = file('src/app/admin/rch-tv/page.tsx');
    expect(admin).toContain('written distribution permissions');
    expect(admin).toContain('guardian releases');
    const studio = file('src/app/media/studios/page.tsx');
    expect(studio).toContain('Pilot commercial proposals');
    expect(studio).toContain('<RchMediaInterestForm/>');
  });
});
