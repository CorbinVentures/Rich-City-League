import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

// Rich City League is now a member-only basketball platform. Keep protected
// competition, profile, social, team and fantasy routes out of search discovery.
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
