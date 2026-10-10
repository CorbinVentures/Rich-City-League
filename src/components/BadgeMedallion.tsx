import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import {
  FaAward, FaBasketball, FaBolt, FaBullseye, FaCrown, FaDumbbell,
  FaFireFlameCurved, FaGem, FaHandshake, FaLocationDot, FaMedal,
  FaShieldHalved, FaStar, FaTrophy, FaUsers,
} from 'react-icons/fa6';
import styles from './BadgeMedallion.module.css';

export type BadgeVisualData = {
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  tier?: string | null;
  category?: string | null;
  requirement_type?: string | null;
};

type MedalSize = 'xs' | 'sm' | 'md' | 'lg';

const TIER_MARKS: Record<string, string> = {
  bronze: 'I', silver: 'II', gold: 'III', elite: 'IV', platinum: 'V', diamond: 'V',
};

export function normalizeBadgeTier(value?: string | null) {
  const tier = (value || 'bronze').toLowerCase().trim();
  return ['bronze', 'silver', 'gold', 'elite', 'platinum', 'diamond'].includes(tier) ? tier : 'bronze';
}

// Vector crests replace emoji, so the same collectible art works across platforms.
export function badgeCrest(badge: BadgeVisualData): IconType {
  const text = [badge.name, badge.category, badge.requirement_type].filter(Boolean).join(' ').toLowerCase();
  if (/founder|royal|king|queen|champion|mvp|legend/.test(text)) return FaCrown;
  if (/diamond|elite|platinum/.test(text)) return FaGem;
  if (/streak|fire|hot|flame|consecutive/.test(text)) return FaFireFlameCurved;
  if (/clutch|three.pointer|sharpshoot|sniper|accuracy|shot/.test(text)) return FaBullseye;
  if (/rebound|board|ironman|gym|training|workout/.test(text)) return FaDumbbell;
  if (/assist|teamwork|helper|recruit|referral/.test(text)) return FaHandshake;
  if (/defen|block|steal|stopper/.test(text)) return FaShieldHalved;
  if (/richmond|804|court|park|check.in|local|run/.test(text)) return FaLocationDot;
  if (/social|fan|community|friend|supporter|follow/.test(text)) return FaUsers;
  if (/rep|xp|level|energy|power/.test(text)) return FaBolt;
  if (/star|spotlight|highlight/.test(text)) return FaStar;
  if (/basketball|points|bucket|scor|player|game/.test(text)) return FaBasketball;
  if (/award|achievement|milestone/.test(text)) return FaAward;
  if (/medal|veteran/.test(text)) return FaMedal;
  return FaTrophy;
}

export function BadgeMedallion({ badge, size = 'md', className = '' }: {
  badge: BadgeVisualData;
  size?: MedalSize;
  className?: string;
}) {
  const tier = normalizeBadgeTier(badge.tier);
  const Icon = badgeCrest(badge);
  const dimension = ({ xs: '68px', sm: '104px', md: '142px', lg: '200px' } as const)[size];

  return (
    <div
      className={[styles.scene, className].filter(Boolean).join(' ')}
      data-tier={tier}
      style={{ '--medal-size': dimension } as CSSProperties}
      role="img"
      aria-label={(badge.name || 'Rich City Hoops achievement') + ', ' + tier + ' badge'}
    >
      <span className={styles.aura} aria-hidden="true" />
      <span className={styles.coin} aria-hidden="true">
        <span className={styles.edge} />
        <span className={styles.underside} />
        <span className={styles.face}>
          <span className={styles.rim} />
          <span className={styles.inner}>
            <span className={styles.topBrand}>RCH</span>
            <Icon className={styles.crest} />
            <span className={styles.rank}>{TIER_MARKS[tier]}</span>
          </span>
          <span className={styles.glint} />
          <span className={styles.spark} />
        </span>
      </span>
    </div>
  );
}

export function BadgeShowcaseCard({ badge, earnedAt, compact = false }: {
  badge: BadgeVisualData;
  earnedAt?: string | null;
  compact?: boolean;
}) {
  const tier = normalizeBadgeTier(badge.tier);
  return (
    <article
      className={[
        'group relative isolate overflow-hidden rounded-2xl border bg-[#091623] text-center transition-colors duration-300',
        'border-white/10 hover:border-white/30',
        compact ? 'px-3 pb-4 pt-3' : 'px-4 pb-5 pt-4',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(69,138,181,.18),transparent_65%)]" />
      <div className="relative mx-auto flex justify-center">
        <BadgeMedallion badge={badge} size={compact ? 'sm' : 'md'} />
      </div>
      <div className="relative mt-3">
        <span className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-blue">{tier} tier</span>
        <h3 className="mt-1 font-display text-base font-black leading-tight text-white">{badge.name || 'RCH Achievement'}</h3>
        {badge.description && <p className="mx-auto mt-2 line-clamp-3 max-w-xs text-xs leading-5 text-white/55">{badge.description}</p>}
        {earnedAt && !Number.isNaN(Date.parse(earnedAt)) && (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
            Earned {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
          </p>
        )}
      </div>
    </article>
  );
}
