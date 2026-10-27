#!/usr/bin/env bash
# RCH Sites booking-quota contention smoke test: DISPOSABLE LOCAL CI DB ONLY.
# No remote URLs, credentials or Supabase production connections are accepted.
set -Eeuo pipefail

command -v docker >/dev/null || { echo "Docker unavailable" >&2; exit 1; }
db="$(docker ps --format '{{.Names}}' | grep -E '^supabase_db_[A-Za-z0-9_-]+$' | head -n 1 || true)"
[[ -n "$db" ]] || { echo "A local Supabase database container is required" >&2; exit 1; }
echo "RCH Sites concurrency testing against local Docker container $db only"
db_exec() { docker exec -i "$db" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
org="b6180000-0000-4000-8000-000000000001"
base_service="c6180000-0000-4000-8000-000000000001"
base_slot="d6180000-0000-4000-8000-000000000001"

db_exec >/dev/null <<'SQL'
-- Local fixture: the same approved tenant must compete for a single spare unit.
insert into auth.users(id,aud,role,email) values
 ('a6180000-0000-4000-8000-000000000001','authenticated','authenticated','rch-concurrency-one@example.test'),
 ('a6180000-0000-4000-8000-000000000002','authenticated','authenticated','rch-concurrency-two@example.test');
delete from public.profiles where id in (
 'a6180000-0000-4000-8000-000000000001',
 'a6180000-0000-4000-8000-000000000002');
insert into public.profiles(id,role,is_active,onboarding_complete)
values
 ('a6180000-0000-4000-8000-000000000001','player',true,true),
 ('a6180000-0000-4000-8000-000000000002','player',true,true);
insert into public.network_organizations(id,slug,name,organization_type,status,is_verified,is_claimed)
values('b6180000-0000-4000-8000-000000000001',
'rch-concurrent-trainer','CI Concurrent Trainer','training','active',true,true);
insert into public.rch_sites(organization_id,slug,config,status)
values('b6180000-0000-4000-8000-000000000001',
'rch-concurrent-trainer','{"siteType":"trainer"}','published');
-- A deliberately tiny quota: 1 spare slot for each resource.
update public.rch_site_plan_limits
set booking_services=2,upcoming_slots=2,confirmed_bookings_monthly=1
where tier='free';
update public.rch_site_booking_quota_rollout
set enforce_booking=true where id=true;
insert into public.rch_site_services(id,organization_id,name,duration_minutes)
values('c6180000-0000-4000-8000-000000000001',
'b6180000-0000-4000-8000-000000000001','Base training session',60);
insert into public.rch_site_slots(id,organization_id,service_id,starts_at,ends_at)
values('d6180000-0000-4000-8000-000000000001',
'b6180000-0000-4000-8000-000000000001',
'c6180000-0000-4000-8000-000000000001',
now()+interval '3 days',now()+interval '3 days 1 hour');
SQL

# Lock the organization subscription BEFORE both independent SQL clients start.
# They queue simultaneously on the same row, then race when the lock is released.
# We require one success and one quota rejection; a stale pre-count would let both
# through, and a broken trigger may make both fail.
race() {
  local name="$1" a="$2" b="$3" count_sql="$4" expected="$5"
  echo "Testing parallel $name creates..."
  db_exec -c "begin;
    select organization_id from public.rch_site_subscriptions
      where organization_id='$org' for update;
    select pg_sleep(5);
    commit;" >"$tmp/$name-lock.log" 2>&1 &
  local lock_pid=$!
  sleep 1

  db_exec -c "$a" >"$tmp/$name-a.log" 2>&1 &
  local a_pid=$!
  db_exec -c "$b" >"$tmp/$name-b.log" 2>&1 &
  local b_pid=$!
  local a_status=0 b_status=0
  wait "$a_pid" || a_status=$?
  wait "$b_pid" || b_status=$?
  wait "$lock_pid" || { echo "Lock holder failed" >&2; cat "$tmp/$name-lock.log" >&2; exit 1; }

  if ! { [[ "$a_status" -eq 0 && "$b_status" -ne 0 ]] ||
         [[ "$a_status" -ne 0 && "$b_status" -eq 0 ]]; }; then
    echo "Expected exactly one successful $name create; got exit statuses $a_status/$b_status" >&2
    cat "$tmp/$name-a.log" "$tmp/$name-b.log" >&2
    exit 1
  fi
  if [[ "$a_status" -ne 0 ]]; then
    grep -q "quota reached" "$tmp/$name-a.log" || { cat "$tmp/$name-a.log" >&2; exit 1; }
  else
    grep -q "quota reached" "$tmp/$name-b.log" || { cat "$tmp/$name-b.log" >&2; exit 1; }
  fi

  local actual
  actual="$(db_exec -At -c "$count_sql" | tr -d '[:space:]')"
  [[ "$actual" == "$expected" ]] || {
    echo "$name count $actual != expected $expected" >&2
    exit 1
  }
  echo "PASS: parallel $name reached exactly $expected, with one quota rejection."
}

race "services" \
  "insert into public.rch_site_services(id,organization_id,name,duration_minutes)
    values('c6180000-0000-4000-8000-000000000002','$org','Concurrent service A',60);" \
  "insert into public.rch_site_services(id,organization_id,name,duration_minutes)
    values('c6180000-0000-4000-8000-000000000003','$org','Concurrent service B',60);" \
  "select count(*) from public.rch_site_services where organization_id='$org' and status='active';" \
  2

race "slots" \
  "insert into public.rch_site_slots(id,organization_id,service_id,starts_at,ends_at)
    values('d6180000-0000-4000-8000-000000000002','$org','$base_service',
           now()+interval '4 days',now()+interval '4 days 1 hour');" \
  "insert into public.rch_site_slots(id,organization_id,service_id,starts_at,ends_at)
    values('d6180000-0000-4000-8000-000000000003','$org','$base_service',
           now()+interval '5 days',now()+interval '5 days 1 hour');" \
  "select count(*) from public.rch_site_slots where organization_id='$org' and status='open' and starts_at>now();" \
  2

# Each client selects a DIFFERENT future slot. Both are otherwise valid, so a
# quota rejection cannot be mistaken for the duplicate-slot unique-index rule.
race "bookings" \
  "insert into public.rch_site_bookings(organization_id,service_id,slot_id,client_id,idempotency_key)
    select '$org', '$base_service',s.id,
      'a6180000-0000-4000-8000-000000000001',
      'f6180000-0000-4000-8000-000000000001'
    from public.rch_site_slots s
    where s.organization_id='$org' and s.status='open'
    order by s.starts_at limit 1;" \
  "insert into public.rch_site_bookings(organization_id,service_id,slot_id,client_id,idempotency_key)
    select '$org', '$base_service',s.id,
      'a6180000-0000-4000-8000-000000000002',
      'f6180000-0000-4000-8000-000000000002'
    from public.rch_site_slots s
    where s.organization_id='$org' and s.status='open'
    order by s.starts_at offset 1 limit 1;" \
  "select count(*) from public.rch_site_bookings where organization_id='$org';" \
  1

# Verify emergency disengagement: DB enforcement can be switched off without
# deleting the tenant's existing services or appointments.
db_exec >/dev/null <<'SQL'
update public.rch_site_booking_quota_rollout set enforce_booking=false where id=true;
insert into public.rch_site_services(id,organization_id,name,duration_minutes)
values('c6180000-0000-4000-8000-000000000004',
'b6180000-0000-4000-8000-000000000001','Disabled gate service',60);
SQL
remaining="$(db_exec -At -c "select count(*) from public.rch_site_services
  where organization_id='$org' and status='active';" | tr -d '[:space:]')"
[[ "$remaining" == "3" ]] || {
  echo "Disabled quota gate did not preserve legacy write behavior" >&2; exit 1;
}
echo "PASS: disabled enforcement gate permits legacy behavior."
echo "RCH Sites local-only parallel booking boundary tests passed."
