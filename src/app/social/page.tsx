import NetworkHome from '@/components/social/NetworkHome';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';

export default function SocialPage(){
  return <>
    <div className="rcl-social-sponsored-wrap">
      <div className="mx-auto max-w-[720px]">
        <NetworkSponsoredPlacement placement="social-feed" surface="social-feed-sponsored" variant="feed"/>
      </div>
    </div>
    <NetworkHome/>
  </>;
}
