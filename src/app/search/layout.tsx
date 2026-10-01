import type { Metadata } from 'next';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';

export const metadata: Metadata = {
  title: "Search RCL",
  description: "Find players, teams, games, and community members.",
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <div className="bg-rcl-black px-4 pt-4">
      <div className="mx-auto max-w-5xl">
        <NetworkSponsoredPlacement placement="search-feature" surface="search-sponsored" variant="banner" />
      </div>
    </div>
    {children}
  </>;
}
