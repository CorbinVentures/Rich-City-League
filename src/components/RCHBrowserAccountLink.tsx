'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaArrowRight } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { trackRchConversion } from '@/lib/analytics/conversion';

/**
 * One account serves public browser and PWA. Never invite an existing member
 * to create a second account. Both destinations must be trusted site paths.
 */
export function RCHBrowserAccountLink({
  guestHref = '/auth/sign-up',
  memberHref,
  guestLabel,
  memberLabel,
  className,
  icon,
  trackingContext = 'unknown',
}: {
  guestHref?: string;
  memberHref: string;
  guestLabel: string;
  memberLabel: string;
  className?: string;
  icon?: ReactNode;
  trackingContext?: string;
}) {
  const { user, loading } = useAuth();
  if (loading) return <span className={className} role="status" aria-live="polite">Checking account…</span>;
  const href = user ? memberHref : guestHref;
  return <Link href={href} className={className} onClick={() => { if (!user) trackRchConversion('join_click', trackingContext); }}>
    {icon}{user ? memberLabel : guestLabel}<FaArrowRight aria-hidden="true"/>
  </Link>;
}
