import type { Metadata } from 'next';
import './globals.css';
import './rcl-future.css';
import './rcl-basketball-branding.css';
import '@/components/RclSplashMockup.css';
import { RCLVisualSystem } from '@/components/RCLVisualSystem';
import { DraftChime } from '@/components/DraftChime';
import { AuthRecoveryRedirect } from '@/components/AuthRecoveryRedirect';
import { PlatformChrome } from '@/components/PlatformChrome';

const siteTitle = 'Rich City League';
const siteDescription = 'Richmond basketball league platform for players, coaches, fans, community, schedules, standings, teams, stats, and news.';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityhoops.com'),
  title: { default: siteTitle, template: '%s | Rich City League' },
  description: siteDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Rich City League — More Than A League' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RCLVisualSystem /><DraftChime /><AuthRecoveryRedirect /><PlatformChrome>{children}</PlatformChrome></body></html>;
}
