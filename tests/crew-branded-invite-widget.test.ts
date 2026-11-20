import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('branded crew invite sharing', () => {
 it('routes crew share actions to a dedicated invite page instead of the generic /crews query', () => {
  const page = read('src/app/crews/page.tsx');
  const invite = read('src/lib/crew-invite-links.ts');
  expect(page).toContain('crewInviteUrl(crew.id)');
  expect(page).toContain('<CrewInviteWidget');
  expect(invite).toContain("return '/crews/invite/' + encodeURIComponent(id)");
  expect(invite).toContain("return '/crews?crew=' + encodeURIComponent(id)");
 });

 it('provides unique crawlable card metadata with a dynamic OG image and noindex for missing crews', () => {
  const layout = read('src/app/crews/invite/[id]/layout.tsx');
  const image = read('src/app/crews/invite/[id]/opengraph-image.tsx');
  expect(layout).toContain('export async function generateMetadata');
  expect(layout).toContain("type: 'website'");
  expect(layout).toContain("card: 'summary_large_image'");
  expect(layout).toContain('/opengraph-image?v=crew-invite-v1');
  expect(layout).toContain("robots: {index: false, follow: false}");
  expect(image).toContain('new ImageResponse');
  expect(image).toContain('crew?.logoUrl');
  expect(image).toContain('VIEW CREW &amp; REQUEST TO JOIN');
 });

 it('preserves existing signup and captain-approved join behavior', () => {
  const page = read('src/app/crews/invite/[id]/page.tsx');
  const loader = read('src/lib/crew-invite.ts');
  expect(page).toContain('crewJoinPath(crew.id)');
  expect(page).toContain("'/auth/sign-up?redirect=' + encodeURIComponent(destination)");
  expect(page).toContain('Membership is not automatic');
  expect(loader).toContain("getPublicClient() as any");
  expect(loader).toContain("if (error) return {status: 'unavailable'");
  expect(loader).toContain("if (!data) return {status: 'missing'");
  expect(loader).not.toContain('service_role');
 });
});
