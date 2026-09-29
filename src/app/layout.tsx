import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import './rcl-future.css';
import './rcl-basketball-branding.css';
import '@/components/RclSplashMockup.css';
import './rcl-accessibility.css';
import './rcl-corporate-polish.css';
import './rcl-social-nav-polish.css';
import './rcl-scorebook-mobile.css';
import './rcl-member-shell.css';
import './rcl-social-activity.css';
import './rcl-pwa.css';
import { RCLVisualSystem } from '@/components/RCLVisualSystem';
import { DraftChime } from '@/components/DraftChime';
import { AuthRecoveryRedirect } from '@/components/AuthRecoveryRedirect';
import { SocialCreateIntent } from '@/components/SocialCreateIntent';
import { MessageIntent } from '@/components/MessageIntent';
import { NetworkActivation } from '@/components/NetworkActivation';
import { MemberSocialNavigation } from '@/components/MemberSocialNavigation';
import { PlatformChrome } from '@/components/PlatformChrome';
import { BadgeUnlockCutscene } from '@/components/BadgeUnlockCutscene';
import { PWAInstallExperience } from '@/components/PWAInstallExperience';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityhoops.com'),
  title: { default: 'Rich City League | Richmond VA Basketball League', template: '%s | Rich City League' },
  description: 'Rich City League is Richmond, Virginia basketball: competitive league play, player profiles, stats, standings, runs, community, fantasy basketball, news and year-round hoops culture.',
  applicationName: 'Rich City League',
  authors: [{ name: 'Rich City League', url: 'https://richcityhoops.com' }],
  creator: 'Rich City League',
  publisher: 'Rich City League',
  category: 'sports',
  keywords: ['Richmond basketball league','Richmond VA basketball','RVA basketball','adult basketball Richmond VA','mens basketball league Richmond','Rich City League','RCL basketball','Richmond hoops','basketball runs Richmond VA'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/rcl-app-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/rcl-app-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'RCL',
    statusBarStyle: 'black',
  },
  formatDetection: { telephone: false },
  openGraph: { type: 'website', locale: 'en_US', siteName: 'Rich City League', title: 'Rich City League | Richmond VA Basketball League', description: 'Richmond-born basketball league and year-round hoops community with competition, player stats, profiles, runs, fantasy, media and culture.', url: 'https://richcityhoops.com', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Rich City League — Richmond basketball, competition and community' }] },
  twitter: { card: 'summary_large_image', title: 'Rich City League | Richmond VA Basketball League', description: 'Richmond-born basketball league and year-round hoops community.', images: ['/opengraph-image'] },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, 'max-image-preview': 'none', 'max-snippet': 0, 'max-video-preview': 0 } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#03070D',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RCLVisualSystem /><PWAInstallExperience /><DraftChime /><AuthRecoveryRedirect /><Suspense fallback={null}><SocialCreateIntent /></Suspense><MessageIntent /><BadgeUnlockCutscene /><PlatformChrome>{children}</PlatformChrome><NetworkActivation /><MemberSocialNavigation /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org','@type':'SportsOrganization',name:'Rich City League',alternateName:'RCL',url:'https://richcityhoops.com',foundingDate:'2011',sport:'Basketball',description:'Richmond-born basketball league and year-round basketball community.',areaServed:{'@type':'City',name:'Richmond, Virginia'},address:{'@type':'PostalAddress',addressLocality:'Richmond',addressRegion:'VA',addressCountry:'US'} }) }} /></body></html>;
}
