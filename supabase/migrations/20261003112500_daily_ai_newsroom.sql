begin;

alter table public.news
  add column if not exists category text not null default 'league-news',
  add column if not exists is_automated boolean not null default false,
  add column if not exists automation_type text,
  add column if not exists source_urls jsonb not null default '[]'::jsonb,
  add column if not exists source_names jsonb not null default '[]'::jsonb,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text[] not null default '{}'::text[],
  add column if not exists generated_by_model text,
  add column if not exists editorial_confidence numeric(4,3);

alter table public.news
  drop constraint if exists news_category_check;
alter table public.news
  add constraint news_category_check
  check (category in ('league-news','rich-city-league','richmond-basketball','richmond-culture','rcl-insider'));

alter table public.news
  drop constraint if exists news_editorial_confidence_check;
alter table public.news
  add constraint news_editorial_confidence_check
  check (editorial_confidence is null or editorial_confidence between 0 and 1);

create index if not exists news_category_published_at_idx
  on public.news(category, published_at desc)
  where status='published';

create unique index if not exists news_daily_automation_beat_idx
  on public.news(automation_type, ((published_at at time zone 'America/New_York')::date))
  where is_automated=true and status='published' and automation_type is not null and published_at is not null;

create table if not exists public.newsroom_product_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  status text not null check (status in ('live','preview','roadmap')),
  public_url text not null,
  seo_terms text[] not null default '{}'::text[],
  priority integer not null default 50 check (priority between 1 and 100),
  approved_for_public boolean not null default true,
  last_featured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsroom_product_topics enable row level security;
revoke all on table public.newsroom_product_topics from anon, authenticated;

create index if not exists newsroom_product_topics_rotation_idx
  on public.newsroom_product_topics(approved_for_public, priority desc, last_featured_at asc nulls first);

insert into public.newsroom_product_topics(slug,title,summary,status,public_url,seo_terms,priority)
values
  ('rcl-network','RCL Network','RCL Network helps Virginia basketball organizations get discovered through public organization pages, events, media, promotion and measurable exposure while organizations keep control of their own registration and operations.','live','https://richcityhoops.com/network',array['Virginia basketball network','basketball organizations Virginia','Richmond basketball exposure'],95),
  ('rch-tv','RCH TV','RCH TV is RCL''s basketball media destination for league streams, creator-led Shorts and Reels, original series, interviews, photography and Virginia basketball storytelling.','live','https://richcityhoops.com/media',array['Virginia basketball media','Richmond basketball videos','RCH TV'],92),
  ('founding-creators','Founding RCH Creators','RCL is building a curated creator network that gives Virginia basketball filmmakers, photographers and short-form creators another destination for original work while they keep their own brands and channels.','preview','https://richcityhoops.com/media/creators',array['Virginia basketball creators','basketball content creators Virginia','Richmond basketball media'],90),
  ('my-hoops','My Hoops','My Hoops organizes a member''s basketball world with personalized opportunities, saved items, calendar tools and exposure-oriented utilities tied to RCL membership.','live','https://richcityhoops.com/my-hoops',array['basketball opportunities Virginia','basketball profile tools','RCL membership'],86),
  ('basketball-passport','Basketball Passport','Basketball Passport is RCL''s shareable player identity layer for profiles, stats, media and basketball history, with deeper exposure tools planned around it.','live','https://richcityhoops.com/players',array['basketball player profile Richmond','basketball player exposure Virginia','basketball stats profile'],84),
  ('rep-system','RCL REP','RCL REP turns verified participation and contribution across the platform into a visible community reputation system with levels, badges and recognition.','live','https://richcityhoops.com/rankings',array['basketball reputation platform','RCL REP','Richmond basketball community'],82),
  ('game-iq','Game IQ','Game IQ connects official scorebook data to deeper basketball analysis for coaches and league operations while keeping recorded facts separate from interpretation.','live','https://richcityhoops.com/games',array['basketball analytics Richmond','basketball game analysis','RCL Game IQ'],80),
  ('fantasy','RCL Fantasy','RCL Fantasy connects official league player statistics to fantasy rosters, matchups and standings, extending engagement beyond game night.','live','https://richcityhoops.com/fantasy',array['local basketball fantasy league','Richmond basketball fantasy','RCL Fantasy'],78),
  ('deeper-player-analytics','Deeper player analytics','The public RCL roadmap includes deeper analytics, smarter player evaluation and richer player histories that connect on-court performance to a more complete basketball identity.','roadmap','https://richcityhoops.com/about',array['basketball analytics platform','player evaluation basketball','basketball player history'],72),
  ('immersive-game-experience','More immersive game experiences','RCL''s public roadmap includes richer game experiences that connect scores, stats, media, social conversation and basketball intelligence around each matchup.','roadmap','https://richcityhoops.com/about',array['basketball game experience','live basketball stats Richmond','local basketball platform'],70),
  ('original-media','More original RCL media','RCL''s public roadmap includes expanded original media and creator-led storytelling around Richmond and Virginia basketball culture.','roadmap','https://richcityhoops.com/about',array['Richmond basketball stories','Virginia basketball media','basketball documentaries Richmond'],68),
  ('community-partnerships','Community partnerships','RCL''s public roadmap includes stronger community partnerships that connect basketball, local organizations, creators and Richmond culture through one platform.','roadmap','https://richcityhoops.com/about',array['Richmond basketball community','Virginia basketball partnerships','Richmond sports culture'],66)
on conflict (slug) do update set
  title=excluded.title,
  summary=excluded.summary,
  status=excluded.status,
  public_url=excluded.public_url,
  seo_terms=excluded.seo_terms,
  priority=excluded.priority,
  approved_for_public=true,
  updated_at=now();

comment on table public.newsroom_product_topics is
  'Approved public product and roadmap topics used by the automated RCL Insider business/feature desk. Roadmap rows are not launch promises and must be described as planned or in development.';


comment on column public.news.is_automated is
  'True when the RCL automated newsroom generated the article.';
comment on column public.news.source_urls is
  'Public source URLs used to ground an automated or manually sourced article.';
comment on column public.news.editorial_confidence is
  'Automated newsroom confidence score. The publishing route rejects low-confidence drafts.';

commit;
