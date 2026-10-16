'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaArrowRight } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';

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
}: {
  guestHref?: string;
  memberHref: string;
  guestLabel: string;
  memberLabel: string;
  className?: string;
  icon?: ReactNode;
}) {
  const { user } = useAuth();
  const href = user ? memberHref : guestHref;
  return <Link href={href} className={className}>
    {icon}{user ? memberLabel : guestLabel}<FaArrowRight aria-hidden="true"/>
  </Link>;
}
