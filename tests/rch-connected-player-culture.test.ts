import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Connected basketball identity contract', () => {
  it('preserves existing role-aware profile routes and a compact, accessible tab dock', () => {
    const profile = source('src/app/social/profile/[id]/page.tsx');
    const dock = source('src/components/ProfileSectionNavigation.tsx');
    expect(profile).toContain('<ProfileSectionNavigation');
    expect(profile).toContain('const PROFILE_TABS:');
    expect(dock).toContain("['highlights', 'stats', 'wall']");
    expect(dock).toContain("['coach', 'wall', 'posts']");
    expect(dock).toContain('aria-current={activeTab === tab');
    expect(dock).toContain("'followers', 'following'");
  });

  it('never presents Court Pulse as verification and links community posts correctly', () => {
    const court = source('src/app/runs/courts/[slug]/page.tsx');
    const pulse = source('src/components/runs/CourtPulseFeed.tsx');
    expect(court).toContain("from('rch_runs_outdoor_courts')");
    expect(court).toContain('<CourtPulseFeed courtSlug={court.slug}');
    expect(pulse).toContain("communityResult.data?.privacy === 'public'");
    expect(pulse).toContain(".eq('status', 'published')");
    expect(pulse).toContain('href={moment.href}');
    expect(pulse).toContain('Posts do not verify attendance or game results.');
  });

  it('requires an explicit interaction to start a profile song', () => {
    const player = source('src/components/ProfileSoundtrack.tsx');
    expect(player).toContain('onClick={() => void togglePlayback()}');
    expect(player).toContain('try { await audio.play(); }');
    expect(player).not.toContain('void audio.play().catch');
    expect(player).toContain("document.addEventListener('visibilitychange'");
  });
});
