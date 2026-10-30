import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {nextUpEligibility} from '../src/lib/runs-next-up-eligibility';
import {assessPilot,PILOT_CATEGORIES,type PilotEvidence} from '../src/lib/runs-pilot-quality-gate';

const src=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=src('supabase/migrations/20261030173000_rch_runs_in_person_queue_gate.sql');

describe('First Runs launch audit: truthful in-person game loop',()=>{
 it('does not treat an RSVP, guest or suggested game as queue attendance',()=>{
  expect(nextUpEligibility({signedIn:false,hostedGameDay:true,checkedIn:true})).toBe('sign_in');
  expect(nextUpEligibility({signedIn:true,hostedGameDay:false,checkedIn:true})).toBe('not_hosted');
  expect(nextUpEligibility({signedIn:true,hostedGameDay:true,checkedIn:false})).toBe('check_in');
  expect(nextUpEligibility({signedIn:true,hostedGameDay:true,checkedIn:true})).toBe('eligible');
 });
 it('requires signed-in check-ins server-side and rejects automated park suggestions',()=>{
  expect(migration).toContain("auth.uid()");
  expect(migration).toContain("from public.run_checkins ck where ck.run_id=p_run and ck.profile_id=v_actor");
  expect(migration).toContain("from public.rch_weekend_circuit_events e where e.run_id=p_run");
  expect(migration).toContain("now()<v_run.starts_at-interval '2 hours'");
  expect(migration).toContain("now()>v_run.starts_at+interval '6 hours'");
  expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
  expect(migration).toContain("status in ('waiting','called','playing')");
  expect(migration).toContain("from public,anon");
  expect(migration).toContain("to authenticated,service_role");
 });
 it('next up screen cannot invite checked-out players into an on-court queue',()=>{
  const queue=src('src/components/runs/RunNextUp.tsx');
  const room=src('src/app/runs/[id]/page.tsx');
  expect(queue).toContain("canJoinQueue=gate==='eligible'");
  expect(queue).toContain("!enabled)return <section");
  expect(queue).toContain('Check in at the venue using the host code first');
  expect(queue).not.toContain('Claim the first spot.');
  expect(room).toContain("checkedIn={Boolean(user?.id&&checkins.has(user.id))}");
  expect(room).toContain("hosted={checkInOpen}");
 });
 it('hidden RLS check-in data is unknown, never misreported as an absent player',()=>{
  const board=src('src/components/runs/RunTeamMatchupBoard.tsx');
  const journey=src('src/components/runs/RunsGameplayJourney.tsx');
  expect(board).toContain("id===viewerId?'RSVP ONLY':'CHECK-IN NOT VISIBLE'");
  expect(roomSrc()).toContain("RSVP · check-in not visible");
  expect(journey).toContain("CHECK-IN NOT VISIBLE");
 });
 it('does not advance personal game stages from a scorecard recorded by someone else',()=>{
  const journey=src('src/components/runs/RunsGameplayJourney.tsx');
  expect(journey).toContain('const stage=verified?4:checkedIn?2:signedUp?1:0;');
  expect(journey).not.toContain('stage=verified?4:scorecardCount>0?3');
  expect(journey).toContain('This does not prove that you played');
  expect(journey).toContain('get_rch_world_expansion');
 });
 it('does not clear a nine-category pilot without independent review and field safety evidence',()=>{
  const noEvidence:PilotEvidence={
   categories:{},venuePermission:false,weatherPlan:false,firstAid:false,
   rosterMinimumMet:false,independentOfficialAssigned:false,twoAccountDeviceTest:false,
   checkinAndResultsVerified:false,consentReviewed:false
  };
  const outcome=assessPilot(noEvidence);
  expect(outcome.cleared).toBe(false);
  expect(PILOT_CATEGORIES).toHaveLength(9);
  expect(outcome.blockers.length).toBeGreaterThanOrEqual(17);
 });
});
function roomSrc(){return src('src/app/runs/[id]/page.tsx');}
