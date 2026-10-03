import { getPublishedNews } from '@/lib/public-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE = 'https://richcityhoops.com';

function xml(value: string) {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

export async function GET() {
  const items = await getPublishedNews(60);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>RCL Newsroom</title>
<link>${SITE}/news</link>
<description>Rich City League, Richmond basketball and Richmond culture news from the RCL Newsroom.</description>
<language>en-us</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.map(item => `<item>
<title>${xml(item.title)}</title>
<link>${SITE}/news/${encodeURIComponent(item.slug)}</link>
<guid isPermaLink="true">${SITE}/news/${encodeURIComponent(item.slug)}</guid>
<description>${xml(item.excerpt || item.title)}</description>
<pubDate>${new Date(item.published_at || item.created_at).toUTCString()}</pubDate>
</item>`).join('\n')}
</channel>
</rss>`;
  return new Response(body, {
    headers: {
      'Content-Type':'application/rss+xml; charset=utf-8',
      'Cache-Control':'public, max-age=300, s-maxage=300',
    },
  });
}
