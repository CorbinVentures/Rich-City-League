import type { MetadataRoute } from 'next';

const SITE = 'https://richcityhoops.com';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
    host: SITE,
  };
}
