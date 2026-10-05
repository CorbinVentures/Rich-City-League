'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

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
  const normalizedSrc = useMemo(() => src?.trim() ?? '', [src]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (failedSrc && failedSrc !== normalizedSrc) setFailedSrc(null);
  }, [failedSrc, normalizedSrc]);

  const resolved = normalizedSrc && failedSrc !== normalizedSrc ? normalizedSrc : DEFAULT_PROFILE_AVATAR;
  const fallbackBackground = {
    backgroundImage: `url("${DEFAULT_PROFILE_AVATAR}")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  };

  return (
    <Image
      src={resolved}
      alt={alt}
      width={96}
      height={96}
      sizes="96px"
      quality={72}
      className={className}
      loading="eager"
      fetchPriority="high"
      style={fallbackBackground}
      onError={() => {
        if (normalizedSrc && resolved !== DEFAULT_PROFILE_AVATAR) setFailedSrc(normalizedSrc);
      }}
    />
  );
}
