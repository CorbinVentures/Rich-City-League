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
import './rcl-executive-marble.css';
import './rcl-executive-alignment.css';
import './rcl-professional-clean.css';
import './rcl-professional-finish.css';
import './rcl-behavioral-design.css';
import './rcl-behavioral-home.css';
import './rcl-social-world.css';
import { RCLVisualSystem } from '@/components/RCLVisualSystem';
import { RCLRuntimeFinish } from '@/components/RCLRuntimeFinish';
import { DraftChime } from '@/components/DraftChime';
import { AuthRecoveryRedirect } from '@/components/AuthRecoveryRedirect';
import { SocialCreateIntent } from '@/components/SocialCreateIntent';
import { MessageIntent } from '@/components/MessageIntent';
import { NetworkActivation } from '@/components/NetworkActivation';
import { PlatformChrome } from '@/components/PlatformChrome';
import { BadgeUnlockCutscene } from '@/components/BadgeUnlockCutscene';
import { PWAInstallExperience } from '@/components/PWAInstallExperience';
import { PWANotificationBridge } from '@/components/PWANotificationBridge';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityhoops.com'),
  title: { default: 'Rich City League | Richmond VA Basketball League', template: '%s | Rich City League' },
  description: 'RCL is Richmond basketball connected: a social world for players, runs, highlights, organizations and community, with Rich City League as the flagship competition.',
  applicationName: 'RCL',
  authors: [{ name: 'Rich City League', url: 'https://richcityhoops.com' }],
  creator: 'Rich City League',
  publisher: 'Rich City League',
  category: 'sports',
  keywords: ['Richmond basketball league','Richmond VA basketball','RVA basketball','adult basketball Richmond VA','mens basketball league Richmond','Rich City League','RCL basketball','Richmond hoops','basketball runs Richmond VA'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'RCL',
    statusBarStyle: 'black',
  },
  formatDetection: { telephone: false },
  openGraph: { type: 'website', locale: 'en_US', siteName: 'RCL', title: 'RCL | Richmond Basketball Social', description: 'Richmond basketball connected: people, runs, highlights, discovery and Rich City League competition in one social platform.', url: 'https://richcityhoops.com', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RCL — Richmond basketball social' }] },
  twitter: { card: 'summary_large_image', title: 'RCL | Richmond Basketball Social', description: 'People, runs, highlights and Rich City League competition in one basketball social world.', images: ['/opengraph-image'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F5F1',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RCLVisualSystem /><RCLRuntimeFinish /><PWAInstallExperience /><PWANotificationBridge /><DraftChime /><AuthRecoveryRedirect /><Suspense fallback={null}><SocialCreateIntent /></Suspense><MessageIntent /><BadgeUnlockCutscene /><PlatformChrome>{children}</PlatformChrome><NetworkActivation /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org','@type':'SportsOrganization',name:'Rich City League',alternateName:'RCL',url:'https://richcityhoops.com',foundingDate:'2011',sport:'Basketball',description:'Richmond-born basketball league and year-round basketball community.',areaServed:{'@type':'City',name:'Richmond, Virginia'},address:{'@type':'PostalAddress',addressLocality:'Richmond',addressRegion:'VA',addressCountry:'US'} }) }} /></body></html>;
}
