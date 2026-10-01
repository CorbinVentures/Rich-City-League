import NetworkHome from '@/components/social/NetworkHome';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';

export default function SocialPage() {
  return <>
    <div className="bg-[#03070d] px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-[720px]">
        <NetworkSponsoredPlacement placement="social-feed" surface="social-feed-sponsored" variant="feed" />
      </div>
    </div>
    <NetworkHome />
  </>;
}
