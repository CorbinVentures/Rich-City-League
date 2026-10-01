import type { Metadata } from 'next';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';

export const metadata: Metadata = {
  title: "Communities",
  description: "Find and join your Rich City League basketball communities.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <div className="bg-rcl-black px-4 pt-4">
      <div className="mx-auto max-w-7xl">
        <NetworkSponsoredPlacement placement="community-feature" surface="communities-sponsored" variant="banner" />
      </div>
    </div>
    {children}
  </>;
}
