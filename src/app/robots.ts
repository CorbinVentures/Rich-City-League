import type { MetadataRoute } from 'next';

const SITE = 'https://www.richcityhoops.com';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/portal/',
        '/admin',
        '/command',
        '/staff',
        '/my-hoops',
        '/sponsors/dashboard',
        '/sponsors/campaigns',
        '/media/creators/dashboard',
        '/league/royaltee/dashboard',
        '/league/royaltee/manage',
        '/messages',
        '/notifications',
        '/settings/',
        '/orders/',
        '/network/dashboard',
        '/friends',
        '/connections',
        '/social',
        '/missions',
        '/fantasy',
        '/pickem',
      ],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
