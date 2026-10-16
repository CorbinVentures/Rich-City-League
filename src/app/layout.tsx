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
import './rch-launch.css';
import './rcl-pwa-contrast.css';
import './rch-app-download.css';
// Runs intentionally uses an immersive dark scene; load its scoped overrides after the sitewide light system.
import './rch-runs-visual-lock.css';
// Loaded last to preserve live-camera and overlay contrast against global light-theme rules.
import './rch-tv-production-lock.css';
// Tablet-only shell fit after all legacy chrome rules, without touching the standalone scorebook.
import './rch-ipad-responsive.css';
// One visual authority for every RCH route after the legacy theme layers.
import './rch-premium-foundation.css';
import './rch-premium-navigation.css';
import './rch-premium-components.css';
import './rch-premium-editorial.css';
import './rch-premium-discover.css';
// Screenshot-driven fit-and-finish guard; keep last to resolve legacy contrast collisions.
import './rch-visual-qa-finish.css';
// Last: keep legacy light headers from reappearing in member and admin views.
import './rch-header-contrast-authority.css';
// Public browser routes inherit the installed-app palette; final layer owns public contrast.
import './rch-public-theme.css';
// Final, scoped action-first member navigation layer; does not override public pages.
import './rch-intent-navigation.css';
// RCH Pulse is isolated to the social home and intentionally wins legacy theme conflicts.
import './rch-pulse.css';
// Retain the merged Discover iOS/PWA contrast authority, loaded after Pulse.
import './rch-scene-visual-authority.css';
import { PWALaunchIntro } from '@/components/PWALaunchIntro';
import { PWA_LAUNCH_BOOTSTRAP } from '@/lib/pwa-launch';
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
import { PWAAppAlertsOnboarding } from '@/components/PWAAppAlertsOnboarding';
import { SeasonalTheme } from '@/components/SeasonalTheme';
import { RCHExperienceGate } from '@/components/RCHExperienceGate';
import { GravityAccountBridge } from '@/components/GravityAccountBridge';
import { SiteAnalyticsObserver } from '@/components/analytics/SiteAnalyticsObserver';
import { verifiedRCHApkUrl } from '@/lib/rch-mobile-experience';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.richcityhoops.com'),
  title: { default: 'Rich City Hoops | Virginia Basketball Community', template: '%s | Rich City Hoops' },
  description: 'Rich City Hoops connects Virginia basketball players, open runs, communities and organizations. Rich City League is the flagship competition.',
  applicationName: 'Rich City Hoops',
  authors: [{ name: 'Rich City Hoops', url: 'https://www.richcityhoops.com' }],
  creator: 'Rich City Hoops',
  publisher: 'Rich City Hoops',
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
    title: 'Rich City Hoops',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  openGraph: { type: 'website', locale: 'en_US', siteName: 'Rich City Hoops', title: 'Rich City Hoops | Virginia Basketball Community', description: 'Richmond basketball connected: people, runs, highlights, discovery and Rich City League competition in one social platform.', url: 'https://www.richcityhoops.com', images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }] },
  twitter: { card: 'summary_large_image', title: 'Rich City Hoops | Virginia Basketball Community', description: 'People, runs, highlights and Rich City League competition in one basketball social world.', images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07172a',
  colorScheme: 'dark',
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
  return <html lang="en" className="rch-premium-root" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: PWA_LAUNCH_BOOTSTRAP }} />{supabaseOrigin ? <><link rel="preconnect" href={supabaseOrigin} crossOrigin="" /><link rel="dns-prefetch" href={supabaseOrigin} /></> : null}</head><body className="rch-premium-app"><AuthRecoveryRedirect /><GravityAccountBridge /><SiteAnalyticsObserver /><RCHExperienceGate publicContent={children} apkUrl={verifiedRCHApkUrl(process.env.RCH_ANDROID_APK_URL)}><PWALaunchIntro /><RCLVisualSystem /><RCLRuntimeFinish /><PWAInstallExperience /><PWANotificationBridge /><PWAAppAlertsOnboarding /><SeasonalTheme /><DraftChime /><Suspense fallback={null}><SocialCreateIntent /></Suspense><MessageIntent /><MessageCallManager /><BadgeUnlockCutscene /><PlatformChrome>{children}</PlatformChrome><NetworkActivation /></RCHExperienceGate><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org','@graph':[{ '@type':'WebSite','@id':'https://www.richcityhoops.com/#website',url:'https://www.richcityhoops.com',name:'Rich City Hoops',alternateName:'RCH',description:'Virginia basketball connected: people, runs, highlights, discovery and Rich City League competition in one social platform.',publisher:{'@id':'https://www.richcityhoops.com/#platform'}},{ '@type':'Organization','@id':'https://www.richcityhoops.com/#platform',name:'Rich City Hoops',alternateName:'RCH',url:'https://www.richcityhoops.com',description:'A basketball social platform connecting players, runs, highlights, organizations and community across Virginia.',areaServed:{'@type':'State',name:'Virginia'}},{ '@type':'SportsOrganization','@id':'https://www.richcityhoops.com/#rich-city-league',name:'Rich City League',alternateName:'RCL League',url:'https://www.richcityhoops.com/league',foundingDate:'2011',sport:'Basketball',description:'The flagship basketball competition property inside Rich City Hoops.',parentOrganization:{'@id':'https://www.richcityhoops.com/#platform'},areaServed:{'@type':'City',name:'Richmond, Virginia'},address:{'@type':'PostalAddress',addressLocality:'Richmond',addressRegion:'VA',addressCountry:'US'}}] }) }} /></body></html>;
}
