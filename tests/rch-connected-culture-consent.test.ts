import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source = (path: string) => readFileSync(join(process.cwd(),path),'utf8');

describe('RCH connected culture: tag consent, lifestyle, private Lab',()=>{
  const migration = source('supabase/migrations/20261026173000_rch_consented_tags_and_lifestyle.sql');
  const social = source('src/components/social/NetworkHome.tsx');
  const profile = source('src/app/social/profile/[id]/page.tsx');
  const requests = source('src/components/media/ConsentedMediaCredits.tsx');
  const credits = source('src/components/media/ConsentedPostCredits.tsx');
  const lifestyle = source('src/components/social/KicksAndFitsShowcase.tsx');
  const lab = source('src/components/profile/PrivateLabActivity.tsx');

  it('keeps tag requests private until tagged adults accept',()=>{
    expect(migration).toContain("status text not null default 'pending'");
    expect(migration).toContain('private.rch_can_request_adult_tag(tagged_profile_id)');
    expect(migration).toContain("status='accepted'");
    expect(migration).toContain("old.status<>'pending'");
    expect(migration).toContain("tagged_profile_id=(select auth.uid())");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain(">= 10");
    expect(requests).toContain("status: accept ? 'accepted' : 'declined'");
    expect(requests).toContain("Permission requested. No public tag appears unless they approve.");
    expect(credits).toContain(".eq('status','accepted')");
    expect(credits).toContain('Member-approved credit, not official player verification or RCH TV licensing.');
  });

  it('classifies existing posts without creating commerce or new primary navigation',()=>{
    expect(migration).toContain("topic text not null check (topic='kicks_fits')");
    expect(migration).toContain("exists(select 1 from public.posts p where p.id=post_id");
    expect(social).toContain("postTopic === 'kicks_fits'");
    expect(social).toContain("db.from('rch_post_topics').insert");
    expect(social).toContain("setPostTopic('none')");
    expect(profile).toContain('<KicksAndFitsShowcase profileId={id}/>');
    expect(lifestyle).toContain(".eq('author_id',profileId)");
    expect(lifestyle).toContain(".eq('status','published')");
  });

  it('only loads private Lab sessions for the profile owner',()=>{
    expect(lab).toContain('user?.id===profileId');
    expect(lab).toContain("if (!ownProfile)");
    expect(lab).toContain("db.from('lab_sessions')");
    expect(lab).toContain(".eq('status','completed')");
    expect(lab).toContain('Your session details stay private.');
    expect(profile).toContain('<PrivateLabActivity profileId={id}/>');
    expect(lab).not.toContain("db.from('posts').insert");
  });

  it('does not turn community tagging into official RCH TV creator authorization',()=>{
    expect(requests).toContain('/media/creators/apply');
    expect(migration).not.toContain('rch_tv_creator_compensation');
    expect(credits).toContain('RCH TV licensing');
    expect(social).toContain('<ConsentedPostCredits postId={item.post.id}/>');
  });
});
