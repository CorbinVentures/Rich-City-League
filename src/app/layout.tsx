import type { Metadata } from 'next';
import './globals.css';
import './rcl-future.css';
import './rcl-basketball-branding.css';
import '@/components/RclSplashMockup.css';
import { RCLVisualSystem } from '@/components/RCLVisualSystem';
import { DraftChime } from '@/components/DraftChime';
import { AuthRecoveryRedirect } from '@/components/AuthRecoveryRedirect';
import { PlatformChrome } from '@/components/PlatformChrome';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityhoops.com'),
  title: { default: 'Rich City League', template: '%s | Rich City League' },
  description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Rich City League', title: 'Rich City League', description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.', url: '/' },
  twitter: { card: 'summary', title: 'Rich City League', description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RCLVisualSystem /><DraftChime /><AuthRecoveryRedirect /><PlatformChrome>{children}</PlatformChrome></body></html>;
}
