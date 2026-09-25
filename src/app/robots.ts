import type { MetadataRoute } from 'next';

const SITE = 'https://richcityhoops.com';
const PUBLIC_LAUNCH = Date.UTC(2026, 9, 1);

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const preview = Date.now() < PUBLIC_LAUNCH;
  if (preview) return { rules: [{ userAgent: '*', disallow: '/' }], sitemap: `${SITE}/sitemap.xml`, host: SITE };
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/','/portal/','/dashboard','/account/','/auth/','/access','/messages/','/notifications','/settings/','/orders/','/api/'] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
