import type { MetadataRoute } from 'next';
import { getLeagueSnapshot, getPublicClient, getPublishedNews } from '@/lib/public-data';

const SITE = 'https://www.richcityhoops.com';
const core = [
  ['',1,'daily'],
  ['/about',.9,'monthly'],
  ['/league',1,'weekly'],
  ['/richmond-basketball-league',1,'weekly'],
  ['/richmond-basketball-runs',1,'daily'],
  ['/network',.95,'daily'],
  ['/community',.9,'daily'],
  ['/sponsors',.9,'weekly'],
  ['/sponsors/start',.8,'weekly'],
  ['/organizations',.95,'daily'],
  ['/network/partners',.85,'weekly'],
  ['/network/partners/apply',.8,'weekly'],
  ['/organizations/region/central-virginia',.8,'daily'],
  ['/organizations/region/tri-cities',.8,'daily'],
  ['/organizations/region/hampton-roads',.8,'daily'],
  ['/organizations/region/northern-virginia',.8,'daily'],
  ['/organizations/region/shenandoah',.75,'daily'],
  ['/organizations/region/southwest-virginia',.75,'daily'],
  ['/organizations/region/statewide',.75,'daily'],
  ['/membership',.9,'weekly'],
  ['/news',.9,'daily'],
  ['/players',.9,'daily'],
  ['/teams',.9,'daily'],
  ['/games',.9,'daily'],
  ['/standings',.85,'daily'],
  ['/leaderboards',.85,'daily'],
  ['/schedule',.85,'daily'],
  ['/stats',.8,'daily'],
  ['/rankings',.8,'daily'],
  ['/coaches',.75,'weekly'],
  ['/runs',1,'daily'],
  ['/draft',.7,'weekly'],
  ['/media',.7,'weekly'],
  ['/shop',.7,'weekly'],
  ['/faq',.7,'monthly'],
  ['/register',.95,'weekly'],
] as const;

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = core.map(([path, priority, changeFrequency]) => ({
    url: `${SITE}${path}`,
    priority,
    changeFrequency,
  }));

  try {
    const [{ teams, games }, news, publicClient] = await Promise.all([
      getLeagueSnapshot(),
      getPublishedNews(500),
      Promise.resolve(getPublicClient()),
    ]);

    for (const team of teams) {
      if (team.slug) entries.push({ url: `${SITE}/teams/${team.slug}`, changeFrequency: 'weekly', priority: .7 });
    }
    // Only list games that the public game detail route can resolve from its league snapshot.
    for (const game of games) {
      if (game.id && game.status !== 'cancelled') entries.push({ url: `${SITE}/games/${game.id}`, changeFrequency: 'weekly', priority: .65 });
    }
    for (const item of news) {
      if (item.slug) entries.push({ url: `${SITE}/news/${item.slug}`, lastModified: item.published_at ? new Date(item.published_at) : undefined, changeFrequency: 'monthly', priority: .75 });
    }

    const client: any = publicClient;
    if (client) {
      const [{ data: players }, { data: organizations }, { data: events }, { data: sites }] = await Promise.all([
        client.from('public_players').select('id').eq('is_active', true).limit(1000),
        client.from('network_organizations').select('slug,updated_at').eq('status', 'active').limit(2000),
        client.from('network_events').select('slug,starts_at').eq('status', 'published').limit(2000),
        client.from('rch_sites').select('slug,updated_at').eq('status', 'published').limit(2000),
      ]);

      for (const player of players ?? []) entries.push({ url: `${SITE}/players/${player.id}`, changeFrequency: 'weekly', priority: .65 });
      for (const organization of organizations ?? []) if (organization.slug) entries.push({ url: `${SITE}/organizations/${organization.slug}`, lastModified: organization.updated_at ? new Date(organization.updated_at) : undefined, changeFrequency: 'weekly', priority: .75 });
      for (const event of events ?? []) if (event.slug) entries.push({ url: `${SITE}/network/events/${event.slug}`, changeFrequency: 'daily', priority: .7 });
      for (const site of sites ?? []) if (site.slug) entries.push({url: `${SITE}/sites/${site.slug}`,lastModified:site.updated_at?new Date(site.updated_at):undefined,changeFrequency:'weekly',priority:.65});
    }
  } catch {
    // Core launch URLs remain available even if a dynamic data source is degraded.
  }

  return entries;
}
