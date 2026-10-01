import type { ReactNode } from 'react';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';

export default function MediaLayout({children}:{children:ReactNode}) {
  return <>
    <div className="bg-rcl-black px-4 pt-4">
      <div className="mx-auto max-w-7xl">
        <NetworkSponsoredPlacement placement="media-feature" surface="rcl-tv-sponsored" variant="banner" />
      </div>
    </div>
    {children}
  </>;
}
