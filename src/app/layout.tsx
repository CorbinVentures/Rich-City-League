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
import { NetworkActivation } from '@/components/NetworkActivation';
import { PlatformChrome } from '@/components/PlatformChrome';
import { BadgeUnlockCutscene } from '@/components/BadgeUnlockCutscene';
import { PWAInstallExperience } from '@/components/PWAInstallExperience';
import { PWANotificationBridge } from '@/components/PWANotificationBridge';
import { SeasonalTheme } from '@/components/SeasonalTheme';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.richcityhoops.com'),
  title: { default: 'Rich City Hoops | Virginia Basketball Network', template: '%s | RCH' },
  description: 'Rich City Hoops connects Virginia basketball: players, runs, highlights, organizations, creators and community, with Rich City League as the flagship competition.',
  applicationName: 'Rich City Hoops',
  authors: [{ name: 'Rich City Hoops', url: 'https://www.richcityhoops.com' }],
  creator: 'Rich City Hoops',
  publisher: 'Rich City Hoops',
  category: 'sports',
  keywords: ['Rich City Hoops','RCH basketball','Virginia basketball network','Richmond basketball league','Richmond VA basketball','RVA basketball','adult basketball Richmond VA','mens basketball league Richmond','Rich City League','Richmond hoops','basketball runs Richmond VA'],
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
    title: 'RCH',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  openGraph: { type: 'website', locale: 'en_US', siteName: 'Rich City Hoops', title: 'Rich City Hoops | Virginia Basketball Network', description: 'Virginia basketball connected: people, runs, highlights, organizations, discovery and Rich City League competition in one network.', url: 'https://www.richcityhoops.com', images: [{ url: 'https://www.richcityhoops.com/rcl-share-20261002.png', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball network' }] },
  twitter: { card: 'summary_large_image', title: 'Rich City Hoops | Virginia Basketball Network', description: 'Players, runs, highlights, organizations and Rich City League competition in one basketball network.', images: ['https://www.richcityhoops.com/rcl-share-20261002.png'] },
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
  return <html lang="en">{supabaseOrigin ? <head><link rel="preconnect" href={supabaseOrigin} crossOrigin="" /><link rel="dns-prefetch" href={supabaseOrigin} /></head> : null}<body><RCLVisualSystem /><RCLRuntimeFinish /><PWAInstallExperience /><PWANotificationBridge /><SeasonalTheme /><DraftChime /><AuthRecoveryRedirect /><Suspense fallback={null}><SocialCreateIntent /></Suspense><MessageIntent /><BadgeUnlockCutscene /><PlatformChrome>{children}</PlatformChrome><NetworkActivation /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org','@graph':[{ '@type':'WebSite','@id':'https://www.richcityhoops.com/#website',url:'https://www.richcityhoops.com',name:'Rich City Hoops',alternateName:'RCH',description:'Virginia basketball connected: people, runs, highlights, organizations, discovery and Rich City League competition in one network.',publisher:{'@id':'https://www.richcityhoops.com/#platform'}},{ '@type':'Organization','@id':'https://www.richcityhoops.com/#platform',name:'Rich City Hoops',alternateName:'RCH',url:'https://www.richcityhoops.com',description:'A basketball network connecting players, runs, highlights, organizations, creators and community across Virginia.',areaServed:{'@type':'State',name:'Virginia'}},{ '@type':'SportsOrganization','@id':'https://www.richcityhoops.com/#rich-city-league',name:'Rich City League',alternateName:'RCL League',url:'https://www.richcityhoops.com/league',foundingDate:'2011',sport:'Basketball',description:'The flagship basketball competition property inside the Rich City Hoops platform.',parentOrganization:{'@id':'https://www.richcityhoops.com/#platform'},areaServed:{'@type':'City',name:'Richmond, Virginia'},address:{'@type':'PostalAddress',addressLocality:'Richmond',addressRegion:'VA',addressCountry:'US'}}] }) }} /></body></html>;
}
