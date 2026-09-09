'use client';

import React from 'react';
import Link from 'next/link';
import { Profile } from '@/types';
import { getInitials } from '@/utils/helpers';

interface AvatarProps {
  profile: Profile | null;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export function Avatar({ profile, size = 'md', href }: AvatarProps) {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  const initials = getInitials(profile?.first_name || '', profile?.last_name || '');

  const content = (
    <div
      className={`${sizeMap[size]} rounded-full bg-rcl-red text-white flex items-center justify-center font-bold`}
      style={{
        backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {!profile?.avatar_url && initials}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
