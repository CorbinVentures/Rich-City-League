import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { GravityLocationPicker } from '@/components/GravityLocationPicker';
import { GravityAccountSyncPanel } from '@/components/GravityAccountSyncPanel';
import { FaArrowLeft, FaCompass, FaLocationDot, FaShieldHalved } from 'react-icons/fa6';

export const metadata: Metadata = {
  title: 'Location & Discovery | Rich City Hoops',
  description: 'Choose a Virginia city and a flexible nearby discovery distance. Keep your RCH basketball experience under your control.',
};

export default function DiscoveryLocationSettingsPage() {
  return <main className="min-h-screen bg-[#061422] pb-28 text-white">
    <ClientPageHero eyebrow="RCH Gravity" title="Location & Discovery" accent="Your basketball world, your choice." description="Choose which part of Virginia you want to explore. Your city shapes recommendations in Discover, Pulse, Today and Runs—without broadcasting your whereabouts." assetKey="social.cover"
      actions={<Link href="/settings" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#4b82ae] px-4 text-xs font-bold text-white"><FaArrowLeft/> Settings</Link>}/>
    <Container maxWidth="lg" className="space-y-5 py-7 sm:py-10">
      <GravityLocationPicker />
      <GravityAccountSyncPanel />
      <section className="rounded-2xl border border-[#315878] bg-[#0b253b] p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><FaCompass className="text-[#91cfff]"/> How Gravity uses your area</h2>
        <p className="mt-3 text-sm leading-7 text-[#d2e1ed]">Nearby city matches receive priority for runs, tournaments, training, and other basketball opportunities. Your selected radius is a preference—not a hard exclusion: major events elsewhere in Virginia remain discoverable. Distances are approximated between city centers, not calculated from your address.</p>
      </section>
      <section className="rounded-2xl border border-[#315878] bg-[#0b253b] p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><FaShieldHalved className="text-[#91cfff]"/> Privacy controls</h2>
        <p className="mt-3 text-sm leading-7 text-[#d2e1ed]">Choosing “Use my location” asks permission only when you tap it. Your device position is converted into a Virginia city inside your browser. Exact coordinates are not stored by Gravity or added to a profile. City and radius preferences stay on this device unless you explicitly enable private account sync. Selecting “All Virginia” clears the local city preference (and updates your account only if you enabled sync).</p>
        <p className="mt-3 text-xs text-[#b3cadf]">Your device or browser may independently remember its location permission. Manage that permission in device settings.</p>
        <Link href="/settings/privacy" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#99d5ff]"><FaLocationDot/> More privacy settings</Link>
      </section>
    </Container>
  </main>;
}
