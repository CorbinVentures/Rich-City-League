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
  title: { default: 'Rich City League | Richmond VA Basketball League', template: '%s | Rich City League' },
  description: 'Rich City League is Richmond, Virginia basketball: competitive league play, player profiles, stats, standings, runs, community, fantasy basketball, news and year-round hoops culture.',
  applicationName: 'Rich City League',
  authors: [{ name: 'Rich City League', url: 'https://richcityhoops.com' }],
  creator: 'Rich City League',
  publisher: 'Rich City League',
  category: 'sports',
  keywords: ['Richmond basketball league','Richmond VA basketball','RVA basketball','adult basketball Richmond VA','mens basketball league Richmond','Rich City League','RCL basketball','Richmond hoops','basketball runs Richmond VA'],
  openGraph: { type: 'website', locale: 'en_US', siteName: 'Rich City League', title: 'Rich City League | Richmond VA Basketball League', description: 'Richmond-born basketball league and year-round hoops community with competition, player stats, profiles, runs, fantasy, media and culture.', url: 'https://richcityhoops.com', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Rich City League — Richmond basketball, competition and community' }] },
  twitter: { card: 'summary_large_image', title: 'Rich City League | Richmond VA Basketball League', description: 'Richmond-born basketball league and year-round hoops community.', images: ['/opengraph-image'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RCLVisualSystem /><DraftChime /><AuthRecoveryRedirect /><PlatformChrome>{children}</PlatformChrome><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org','@type':'SportsOrganization',name:'Rich City League',alternateName:'RCL',url:'https://richcityhoops.com',foundingDate:'2011',sport:'Basketball',description:'Richmond-born basketball league and year-round basketball community.',areaServed:{'@type':'City',name:'Richmond, Virginia'},address:{'@type':'PostalAddress',addressLocality:'Richmond',addressRegion:'VA',addressCountry:'US'} }) }} /></body></html>;
}
