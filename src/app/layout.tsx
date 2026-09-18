import type { Metadata } from 'next';
import './globals.css';
import '@/components/RclSplashMockup.css';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminControlShortcut } from '@/components/AdminControlShortcut';
import { RCLVisualSystem } from '@/components/RCLVisualSystem';
import { DraftChime } from '@/components/DraftChime';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityleague.com'),
  title: { default: 'Rich City League', template: '%s | Rich City League' },
  description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Rich City League', title: 'Rich City League', description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.', url: '/' },
  twitter: { card: 'summary', title: 'Rich City League', description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RCLVisualSystem /><DraftChime /><SiteHeader /><AdminControlShortcut />{children}</body></html>;
}
