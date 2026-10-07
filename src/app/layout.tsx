import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import './rcl-future.css';
import './rcl-basketball-branding.css';
import './rcl-accessibility.css';
import './rcl-corporate-polish.css';
import './rcl-social-nav-polish.css';
import './rcl-scorebook-mobile.css';
import './rcl-social-activity.css';
import './rcl-pwa.css';
import './rcl-executive-marble.css';
import './rcl-executive-alignment.css';
import './rcl-professional-clean.css';
import './rcl-professional-finish.css';
import './rcl-behavioral-design.css';
import './rcl-behavioral-home.css';
import './rcl-social-world.css';
import './rcl-site-uniform.css';
import './rcl-mockup-system.css';
import './rcl-presentation-polish.css';
import './rcl-seasonal-themes.css';
import './rcl-draft-uniform.css';
import './rcl-social-search-stories.css';
import './rcl-social-composer.css';
import './rcl-messaging.css';
import { RCLVisualSystem } from '@/components/RCLVisualSystem';
import { RCLRuntimeFinish } from '@/components/RCLRuntimeFinish';
import { DraftChime } from '@/components/DraftChime';
import { AuthRecoveryRedirect } from '@/components/AuthRecoveryRedirect';
import { SocialCreateIntent } from '@/components/SocialCreateIntent';
import { MessageIntent } from '@/components/MessageIntent';
import { MessageCallManager } from '@/components/messaging/MessageCallManager';
import { NetworkActivation } from '@/components/NetworkActivation';
import { PlatformChrome } from '@/components/PlatformChrome';
import { BadgeUnlockCutscene } from '@/components/BadgeUnlockCutscene';
import { PWAInstallExperience } from '@/components/PWAInstallExperience';
import { PWANotificationBridge } from '@/components/PWANotificationBridge';
import { SeasonalTheme } from '@/components/SeasonalTheme';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityhoops.com'),
  title: { default: 'RCL | Richmond Basketball Social', template: '%s | RCL' },
  description: 'RCL is Richmond basketball connected: a social world for players, runs, highlights, organizations and community, with Rich City League as the flagship competition.',
  applicationName: 'RCL',
  authors: [{ name: 'RCL', url: 'https://richcityhoops.com' }],
  creator: 'RCL',
  publisher: 'RCL',
  category: 'sports',
  keywords: ['Richmond basketball league','Richmond VA basketball','RVA basketball','adult basketball Richmond VA','mens basketball league Richmond','Rich City League','RCL basketball','Richmond hoops','basketball runs Richmond VA'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg?v=black-r-1', type: 'image/svg+xml' },
      { url: '/icon?v=black-r-1', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon?v=black-r-1', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'RCL',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  openGraph: { type: 'website', locale: 'en_US', siteName: 'RCL', title: 'RCL | Richmond Basketball Social', description: 'Richmond basketball connected: people, runs, highlights, discovery and Rich City League competition in one social platform.', url: 'https://richcityhoops.com', images: [{ url: 'https://richcityhoops.com/rcl-share-20261002.png', width: 1200, height: 630, alt: 'RCL — Richmond basketball social' }] },
  twitter: { card: 'summary_large_image', title: 'RCL | Richmond Basketball Social', description: 'People, runs, highlights and Rich City League competition in one basketball social world.', images: ['https://richcityhoops.com/rcl-share-20261002.png'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F6F9FC',
  colorScheme: 'light',
};

function getSupabaseOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configuredUrl) return null;
  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabaseOrigin = getSupabaseOrigin();
  return <html lang="en">{supabaseOrigin ? <head><link rel="preconnect" href={supabaseOrigin} crossOrigin="" /><link rel="dns-prefetch" href={supabaseOrigin} /></head> : null}<body><RCLVisualSystem /><RCLRuntimeFinish /><PWAInstallExperience /><PWANotificationBridge /><SeasonalTheme /><DraftChime /><AuthRecoveryRedirect /><Suspense fallback={null}><SocialCreateIntent /></Suspense><MessageIntent /><MessageCallManager /><BadgeUnlockCutscene /><PlatformChrome>{children}</PlatformChrome><NetworkActivation /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org','@graph':[{ '@type':'WebSite','@id':'https://richcityhoops.com/#website',url:'https://richcityhoops.com',name:'RCL',alternateName:'RCL Basketball Social',description:'Richmond basketball connected: people, runs, highlights, discovery and Rich City League competition in one social platform.',publisher:{'@id':'https://richcityhoops.com/#platform'}},{ '@type':'Organization','@id':'https://richcityhoops.com/#platform',name:'RCL',alternateName:'RCL Basketball Social',url:'https://richcityhoops.com',description:'A basketball social platform connecting players, runs, highlights, organizations and community across Virginia.',areaServed:{'@type':'State',name:'Virginia'}},{ '@type':'SportsOrganization','@id':'https://richcityhoops.com/#rich-city-league',name:'Rich City League',alternateName:'RCL League',url:'https://richcityhoops.com/league',foundingDate:'2011',sport:'Basketball',description:'The flagship basketball competition property inside the RCL platform.',parentOrganization:{'@id':'https://richcityhoops.com/#platform'},areaServed:{'@type':'City',name:'Richmond, Virginia'},address:{'@type':'PostalAddress',addressLocality:'Richmond',addressRegion:'VA',addressCountry:'US'}}] }) }} /></body></html>;
}
