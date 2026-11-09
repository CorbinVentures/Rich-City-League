'use client';

import { useEffect, useState } from 'react';

export type RCHVisualCategory = 'league' | 'runs' | 'media' | 'coaching' | 'community' | 'operations';

const categories: Array<[RegExp, RCHVisualCategory]> = [
  [/^\/admin\/rch-tv(\/|$)|^\/admin\/network\/(editorial|campaigns)(\/|$)/, 'media'],
  [/^\/admin\/runs(\/|$)/, 'runs'],
  [/^\/portal\/scorebook(\/|$)/, 'league'],
  [/^\/(admin|command|portal|dashboard|professional|account)(\/|$)/, 'operations'],
  [/^\/(media|news|clips|stories|today|live|watch|press|rch-tv)(\/|$)/, 'media'],
  [/^\/(runs|courts|crews|territories|commonwealth|takeover|rep)(\/|$)/, 'runs'],
  [/^\/(coaches|training|scouting|game-iq|labs)(\/|$)/, 'coaching'],
  [/^\/(league|teams|games|schedule|seasons|standings|divisions|draft|awards|badges|championships|tournaments|playoffs)(\/|$)/, 'league'],
  [/^\/(community|communities|social|pulse|friends|connections|messages|notifications|players|fans|profile|my-hoops|search|events|faq|about|home)(\/|$)/, 'community'],
  [/^\/(sponsors|shop|membership|website-creator|sites|join)(\/|$)/, 'operations'],
];

export function getRCHVisualCategory(pathname: string): RCHVisualCategory {
  const path = pathname === '/' ? '/league' : pathname.toLowerCase();
  return categories.find(([pattern]) => pattern.test(path))?.[1] ?? 'community';
}

const categoryLabels: Record<RCHVisualCategory, string> = {
  league: 'Rich City League',
  runs: 'RCH Runs',
  media: 'RCH TV and stories',
  coaching: 'Coaching and player development',
  community: 'Virginia basketball community',
  operations: 'League operations',
};

export function RCHRouteVisualBand({ category, pathname, rootId }: {
  category: RCHVisualCategory;
  pathname: string;
  rootId: string;
}) {
  const [showBand, setShowBand] = useState(false);

  useEffect(() => {
    const root = document.getElementById(rootId);
    const main = root?.querySelector('main');
    const candidates = Array.from(main?.querySelectorAll('header, [class*="hero"], [class*="Hero"], [data-page-hero]') ?? []);
    const hasImageHero = candidates.some(hero => {
      const imageLayer = hero.querySelector('img, picture, video, [class*="art"], [class*="Art"], [class*="image"], [class*="Image"]');
      return Boolean(
        hero.querySelector('img, picture, video')
        || getComputedStyle(hero).backgroundImage.includes('url(')
        || getComputedStyle(hero, '::before').backgroundImage.includes('url(')
        || (imageLayer && getComputedStyle(imageLayer).backgroundImage.includes('url('))
      );
    });
    setShowBand(!hasImageHero);
  }, [category, pathname, rootId]);

  if (!showBand) return null;

  return (
    <div
      className={`rch-route-visual-band rch-route-visual-band--${category}`}
      role="img"
      aria-label={`AI-generated promotional basketball imagery for ${categoryLabels[category]}.`}
    >
      <span aria-hidden="true">AI-GENERATED CAMPAIGN IMAGE <i>·</i> {categoryLabels[category]}</span>
    </div>
  );
}
