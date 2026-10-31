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
  // Render a genuine guest link before hydration, including with JavaScript disabled.
  // Once auth resolves, members receive their own destination instead.
  if (loading) return <Link href={guestHref} className={className} onClick={() => trackRchConversion('join_click', trackingContext)}>
    {icon}{guestLabel}<FaArrowRight aria-hidden="true"/>
  </Link>;
  const href = user ? memberHref : guestHref;
  return <Link href={href} className={className} onClick={() => { if (!user) trackRchConversion('join_click', trackingContext); }}>
    {icon}{user ? memberLabel : guestLabel}<FaArrowRight aria-hidden="true"/>
  </Link>;
}
