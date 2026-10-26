import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');

describe('RCH Mixtapes v1 integration and consent boundaries', () => {
  const migration = source('supabase/migrations/20261026162500_rch_own_media_mixtapes.sql');
  const studio = source('src/components/media/MixtapeStudio.tsx');
  const viewer = source('src/app/mixtapes/[id]/page.tsx');
  const profile = source('src/app/social/profile/[id]/page.tsx');
  const runs = source('src/app/runs/page.tsx');
  const myPlayer = source('src/components/ProfileShowcase.tsx');

  it('restricts playlist items to creator-owned, published video posts', () => {
    expect(migration).toContain('p.author_id=(select auth.uid())');
    expect(migration).toContain("p.status='published'::public.content_status");
    expect(migration).toContain("m.status='draft'");
    expect(migration).toContain('sort_order between 1 and 12');
    expect(migration).toContain("private.can_view_social_profile(m.owner_id)");
    expect(migration).not.toContain('award_xp(');
    expect(migration).not.toContain('award_run_rep(');
  });

  it('requires explicit publication rights and uses one atomic database RPC', () => {
    expect(studio).toContain('rightsConfirmed');
    expect(studio).toContain("db.rpc('rch_publish_own_mixtape'");
    expect(migration).toContain('if not coalesce(p_rights_confirmed,false)');
    expect(migration).toContain("security invoker set search_path=''");
    expect(migration).toContain('insert into public.rch_mixtape_items');
    expect(migration).toContain("update public.rch_mixtapes set status='published'");
  });

  it('rechecks underlying post visibility on reads and can withdraw a collection', () => {
    expect(viewer).toContain("db.from('posts').select('id,author_id,body,media_urls')");
    expect(viewer).toContain("if (post.author_id !== mixtape.owner_id) return;");
    expect(viewer).toContain("db.from('rch_mixtapes').delete()");
    expect(viewer).toContain('pickRchClipUrl(post.media_urls)');
    expect(profile).toContain("<MixtapeStudio profileId={id}/>");
    expect(migration).toContain("references public.posts(id) on delete cascade");
  });

  it('uses the existing solo-friendly Runs filter instead of creating unsafe unsolicited contact', () => {
    expect(runs).toContain("const [soloOnly,setSoloOnly]=useState(searchParams.get('solo')==='1')");
    expect(myPlayer).toContain('/runs?view=list&solo=1');
  });
});
