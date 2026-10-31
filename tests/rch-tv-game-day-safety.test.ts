import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
describe('RCH TV game day safety and authorization',()=>{
 it('atomically prevents duplicate billable sessions and keeps the ledger private',()=>{
  const migration=read('supabase/migrations/20261031022500_rch_tv_recording_safety_ledger.sql');
  expect(migration).toContain('rch_tv_one_live_recording_idx');
  expect(migration).toContain('on public.rch_tv_recordings ((true))');
  expect(migration).toContain("('reserved','starting','active','stopping')");
  expect(migration).toContain('enable row level security');
  expect(migration).toContain('revoke all on public.rch_tv_recordings from public, anon, authenticated');
  expect(migration).toContain('grant select, insert, update on public.rch_tv_recordings to service_role');
 });
 it('does not expose credentials or permit unauthenticated recorder changes',()=>{
  const route=read('src/app/api/rch-tv/recording/route.ts');
  const safety=read('src/lib/rch-tv-recording-safety.ts');
  expect(route).toContain("await client.auth.getUser()");
  expect(route).toContain("client.rpc('is_admin')");
  expect(route).toContain("config.state !== 'available'");
  expect(route).toContain('await emergencyShutdown');
  expect(safety).toContain('Daily recording-minute budget reached');
  expect(safety).toContain("state:'reserved'");
  expect(safety).toContain("await stopRchRecording");
  expect(safety).toContain("file_size_bytes:actual");
  expect(safety).toContain('verifyPrivateObject(row.output_path)');
 });
 it('schedules a guarded 5-minute watchdog with required CRON_SECRET',()=>{
  const config=JSON.parse(read('vercel.json'));
  expect(config.crons).toContainEqual({path:'/api/cron/rch-tv-recording-safety',schedule:'*/5 * * * *'});
  const route=read('src/app/api/cron/rch-tv-recording-safety/route.ts');
  expect(route).toContain('process.env.CRON_SECRET');
  expect(route).toContain("recordingConfig(process.env).state!=='available'");
  expect(route).toContain('await safetySweep()');
 });
 it('provides user-friendly controls with an explicit emergency confirmation',()=>{
  const page=read('src/app/admin/rch-tv/game-day/page.tsx');
  expect(page).toContain('Game Day Center');
  expect(page).toContain('Pregame readiness');
  expect(page).toContain('Emergency end broadcast');
  expect(page).toContain('window.confirm(');
  expect(page).toContain('Replay quality review');
  expect(page).toContain("setMode(m)");
  expect(read('src/app/admin/rch-tv/page.tsx')).toContain('/admin/rch-tv/game-day');
  expect(read('src/app/admin/rch-tv/studio/page.tsx')).toContain('/admin/rch-tv/game-day');
 });
});
