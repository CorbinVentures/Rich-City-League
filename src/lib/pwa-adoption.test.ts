import { describe, expect, it } from 'vitest';
import { classifyMobilePwaLaunch } from './pwa-adoption';

describe('classifyMobilePwaLaunch', () => {
  it('counts an installed iPhone PWA launch', () => {
    expect(classifyMobilePwaLaunch({ standalone: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })).toBe('ios');
  });
  it('counts Android standalone launches', () => {
    expect(classifyMobilePwaLaunch({ standalone: true, userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 9)' })).toBe('android');
  });
  it('handles iPads reporting a Mac platform', () => {
    expect(classifyMobilePwaLaunch({ standalone: true, userAgent: 'Mozilla/5.0 (Macintosh)', navigatorPlatform: 'MacIntel', maxTouchPoints: 5 })).toBe('ios');
  });
  it('does not count a normal iPhone browser visit', () => {
    expect(classifyMobilePwaLaunch({ standalone: false, userAgent: 'Mozilla/5.0 (iPhone)' })).toBeNull();
  });
  it('does not count desktop standalone applications', () => {
    expect(classifyMobilePwaLaunch({ standalone: true, userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBeNull();
  });
});