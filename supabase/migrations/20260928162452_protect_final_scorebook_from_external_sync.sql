create or replace function public.protect_final_scorebook_result()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.scorebook_status in ('final','locked')
     and new.scorebook_status = old.scorebook_status then
    new.home_score := old.home_score;
    new.away_score := old.away_score;
    new.status := old.status;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_final_scorebook_result() from public, anon, authenticated;

drop trigger if exists protect_final_scorebook_result on public.games;
create trigger protect_final_scorebook_result
before update on public.games
for each row execute function public.protect_final_scorebook_result();
