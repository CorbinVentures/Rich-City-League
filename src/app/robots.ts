import type { MetadataRoute } from 'next';

const SITE = 'https://www.richcityhoops.com';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/auth/',
        '/member-access',
        '/dashboard',
        '/portal/',
        '/admin/',
        '/account/',
        '/profile',
        '/messages',
        '/notifications',
        '/settings/',
        '/orders/',
        '/network/dashboard',
        '/friends',
        '/connections',
        '/social',
        '/communities',
        '/missions',
        '/fantasy',
        '/pickem',
      ],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
