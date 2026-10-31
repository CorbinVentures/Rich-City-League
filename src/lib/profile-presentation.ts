/** Presentation only: this never grants a role or staff permissions. */
export function profilePresentation(role: string | null, hasPlayer: boolean, hasPublishedCoach: boolean) {
  if (hasPublishedCoach || role === 'coach' || role === 'cheerleading_coach') return 'coach';
  if (hasPlayer || role === 'player') return 'player';
  return 'fan';
}

export function profileSections(kind: 'player' | 'coach' | 'fan', hasPlayer: boolean) {
  const sections = kind === 'player'
    ? ['highlights', 'stats', 'badges', 'career', 'wall', 'posts', 'media']
    : kind === 'coach'
      ? ['coach', 'wall', 'posts', 'badges', 'media']
      : ['wall', 'posts', 'media', 'badges'];
  // Members who coach and play retain their playing history.
  if (kind === 'coach' && hasPlayer) sections.push('stats', 'career', 'highlights');
  return sections;
}
