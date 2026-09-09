import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  metadataBase: new URL('https://richcityleague.com'),
  title: {
    default: 'Rich City League',
    template: '%s | Rich City League',
  },
  description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Rich City League',
    title: 'Rich City League',
    description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.',
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'Rich City League',
    description: 'Richmond basketball league platform for schedules, standings, teams, players, and news.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
