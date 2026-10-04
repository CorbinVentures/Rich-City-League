'use client';

import { useState } from 'react';

export const DEFAULT_PROFILE_AVATAR = '/default-basketball-avatar.svg';

export function ProfileAvatarMedia({
  src,
  alt = '',
  className = '',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = !failed && src?.trim() ? src : DEFAULT_PROFILE_AVATAR;

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
