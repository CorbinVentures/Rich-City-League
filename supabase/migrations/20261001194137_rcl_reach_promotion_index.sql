begin;

create index if not exists network_reach_daily_breakdown_promotion_date_idx
  on public.network_reach_daily_breakdown(promotion_id, metric_date desc)
  where promotion_id is not null;

commit;
