begin;

create unique index if not exists run_highlight_claims_once_per_run
  on public.run_highlight_claims(run_id,profile_id);

create or replace function public.claim_latest_run_highlight(p_run uuid)
returns table(rep_awarded integer,post_id uuid) language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); r public.runs%rowtype; chosen uuid; claim_id uuid; awarded boolean;
begin
  if actor is null then raise exception 'Sign in to claim a highlight'; end if;
  select * into r from public.runs where id=p_run;
  if r.id is null then raise exception 'Run not found'; end if;
  if actor<>r.host_id and not exists(select 1 from public.run_players rp where rp.run_id=p_run and rp.profile_id=actor) then
    raise exception 'Join the run before claiming a player highlight';
  end if;
  if exists(select 1 from public.run_highlight_claims h where h.run_id=p_run and h.profile_id=actor) then
    raise exception 'Highlight bonus already claimed for this run';
  end if;
  select p.id into chosen
    from public.posts p
    where p.author_id=actor and p.status='published'
      and jsonb_typeof(p.media_urls)='array' and jsonb_array_length(p.media_urls)>0
      and p.created_at between r.starts_at - interval '2 hours' and r.starts_at + interval '72 hours'
    order by p.created_at desc limit 1;
  if chosen is null then raise exception 'Post a photo or video highlight from this run first'; end if;
  insert into public.run_highlight_claims(run_id,profile_id,post_id) values(p_run,actor,chosen)
    returning id into claim_id;
  awarded:=public.award_run_rep(actor,35,'run_highlight','run_highlight',claim_id);
  perform public.unlock_run_badges(actor);
  return query select case when awarded then 35 else 0 end,chosen;
end $$;
grant execute on function public.claim_latest_run_highlight(uuid) to authenticated;

commit;
