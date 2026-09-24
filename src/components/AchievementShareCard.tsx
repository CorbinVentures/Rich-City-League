'use client';

import { useState } from 'react';
import { FaShareNodes } from 'react-icons/fa6';

type AchievementShareProps = {
  memberName: string;
  memberUsername?: string | null;
  badgeName: string;
  badgeDescription?: string | null;
  badgeIcon?: string | null;
  badgeTier?: string | null;
  earnedAt?: string | null;
};

export function AchievementShareCard({ memberName, memberUsername, badgeName, badgeDescription, badgeIcon, badgeTier, earnedAt }: AchievementShareProps) {
  const [copied, setCopied] = useState(false);
  const shareText = `${memberName} just unlocked ${badgeName} on Rich City League. Build your REP. Earn your place.`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://richcityhoops.com';

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${badgeName} | Rich City League`, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Native share cancellation should not surface as an application error.
    }
  }

  return <article className="overflow-hidden rounded-3xl border border-rcl-orange/25 bg-gradient-to-br from-[#101820] via-[#081019] to-black shadow-2xl">
    <div className="relative min-h-[290px] p-6 sm:p-8">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-rcl-orange/20 bg-rcl-orange/5" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-black uppercase tracking-[.28em] text-rcl-orange">Rich City League · Achievement</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white/50">{badgeTier || 'RCL'}</span>
        </div>
        <div className="mt-8 text-6xl">{badgeIcon || '🏆'}</div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-white/35">Badge Unlocked</p>
        <h3 className="mt-1 font-display text-3xl font-black uppercase leading-none text-white">{badgeName}</h3>
        {badgeDescription && <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">{badgeDescription}</p>}
        <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div><b className="block text-sm text-white">{memberName}</b><span className="text-[10px] text-white/35">{memberUsername ? '@'+memberUsername : 'RCL Member'}{earnedAt ? ' · '+new Date(earnedAt).toLocaleDateString() : ''}</span></div>
          <span className="text-[9px] font-black uppercase tracking-[.18em] text-rcl-orange">richcityhoops.com</span>
        </div>
      </div>
    </div>
    <button type="button" onClick={share} className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/[.04] px-5 py-4 text-[10px] font-black uppercase tracking-[.16em] text-white transition hover:bg-rcl-orange hover:text-black"><FaShareNodes />{copied ? 'Share link copied' : 'Share achievement'}</button>
  </article>;
}
