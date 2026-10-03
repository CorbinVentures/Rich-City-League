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
  check (category in ('league-news','rich-city-league','richmond-basketball','richmond-culture'));

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

comment on column public.news.is_automated is
  'True when the RCL automated newsroom generated the article.';
comment on column public.news.source_urls is
  'Public source URLs used to ground an automated or manually sourced article.';
comment on column public.news.editorial_confidence is
  'Automated newsroom confidence score. The publishing route rejects low-confidence drafts.';

commit;
