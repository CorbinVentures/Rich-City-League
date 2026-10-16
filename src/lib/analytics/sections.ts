/** Deliberately coarse, privacy-safe site categorization. Never send raw URLs. */
export function analyticsSection(pathname: string): string | null {
  if (pathname === '/') return 'home';
  const root = pathname.split('/').filter(Boolean)[0];
  if (root === 'social' || root === 'pulse') return 'social';
  if (root === 'discover' || root === 'explore' || root === 'search') return 'discover';
  if (root === 'runs' || root === 'richmond-basketball-runs') return 'runs';
  if (root === 'crews') return 'crews';
  if (root === 'commonwealth') return 'commonwealth';
  if (['league','games','standings','schedule','stats','draft','rankings'].includes(root)) return 'league';
  if (root === 'players') return 'players';
  if (root === 'teams') return 'teams';
  if (root === 'media' || root === 'clips') return 'media';
  if (root === 'news') return 'news';
  if (root === 'communities' || root === 'community') return 'communities';
  if (root === 'organizations' || root === 'network') return 'organizations';
  if (root === 'shop') return 'shop';
  if (root === 'professional') return 'professional';
  return null;
}
