import { describe, expect, it } from 'vitest';
import {
  canSendExternalAnalytics, externalAnalyticsSection, privacySignalBlocked,
} from './external-consent';

describe('third-party analytics consent and route guard', () => {
  it('defaults to no delivery without explicit consent', () => {
    expect(canSendExternalAnalytics('/', false, false)).toBe(false);
  });
  it('only allows a named public landing page', () => {
    expect(externalAnalyticsSection('/')).toBe('home');
    expect(externalAnalyticsSection('/runs')).toBe('runs');
    expect(externalAnalyticsSection('/richmond-basketball-runs')).toBe('richmond_basketball_runs');
    expect(canSendExternalAnalytics('/runs', true, false)).toBe(true);
  });
  it('refuses sensitive routes, detail pages and query-bearing strings', () => {
    for (const path of ['/messages','/messages/123','/admin','/command','/settings/privacy',
      '/auth/sign-in','/profile','/players/example','/organizations/1',
      '/rch-sites/organization','/runs/new','/runs?id=1','/shop/checkout']) {
      expect(canSendExternalAnalytics(path, true, false)).toBe(false);
    }
  });
  it('Do Not Track and Global Privacy Control override consent', () => {
    expect(privacySignalBlocked({doNotTrack:'1'})).toBe(true);
    expect(privacySignalBlocked({globalPrivacyControl:true})).toBe(true);
    expect(privacySignalBlocked({doNotTrack:'0'})).toBe(false);
    expect(canSendExternalAnalytics('/', true, true)).toBe(false);
  });
});
