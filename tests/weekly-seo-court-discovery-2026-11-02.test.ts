import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Weekly SEO: verified public basketball court discovery', () => {
  it('only lists active courts from the already-verified public outdoor court view', () => {
    const sitemap = read('src/app/sitemap.ts');
    expect(sitemap).toContain("client.from('rch_runs_outdoor_courts').select('slug').eq('is_active', true)");
    expect(sitemap).toContain('/runs/courts/${encodeURIComponent(court.slug)}');
    expect(sitemap).not.toContain("client.from('basketball_locations').select('slug')");
  });

  it('provides server-rendered court metadata and canonicals', () => {
    const layout = read('src/app/runs/courts/[slug]/layout.tsx');
    expect(layout).toContain('export async function generateMetadata');
    expect(layout).toContain('alternates: { canonical: url }');
    expect(layout).toContain('Basketball Court |');
    expect(layout).toContain("db.from('rch_runs_outdoor_courts')");
    expect(layout).toContain("if (result.status === 'missing') notFound()");
    expect(layout).toContain("robots: { index: false, follow: false }");
  });

  it('applies noindex only to confirmed missing courts', () => {
    const layout = read('src/app/runs/courts/[slug]/layout.tsx');
    expect(layout).toContain("if (result.status === 'missing') {");
    expect(layout).toContain("if (result.status === 'unavailable') {");
    expect(layout).toContain("return { title: 'Basketball court | Rich City Hoops' };");
  });

  it('does not index confirmed missing individual Runs', () => {
    const layout = read('src/app/runs/[id]/layout.tsx');
    expect(layout).toContain("if(!data)return {title:'Run not found | RCH Runs'");
    expect(layout).toContain('robots:{index:false,follow:false}');
  });
});
