'use client';

import React from 'react';
import Link from 'next/link';
import { Profile } from '@/types';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

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

  const content = (
    <div className={`${sizeMap[size]} overflow-hidden rounded-full bg-white`}>
      <ProfileAvatarMedia src={profile?.avatar_url} alt={profile?.display_name || 'Profile'} className="h-full w-full object-cover" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
