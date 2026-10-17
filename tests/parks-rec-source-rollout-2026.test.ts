import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {localityNames} from '../src/lib/runs-geography';
import {verifiedParksRecFacility,buildCourtMapPins,type WorldCourt} from '../src/lib/runs-world-game';
const file=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const arlington=file('supabase/migrations/20261017234500_parks_rec_official_arlington_prince_william.sql');
const additional=file('supabase/migrations/20261017234600_henrico_shenandoah_official_basketball_courts.sql');
const world=file('src/components/runs/RunsWorldGame.tsx');
const atlas=file('src/components/runs/AccurateVirginiaMap.tsx');
const quality=file('src/app/admin/runs/map-quality/page.tsx');

const sourceSql=file('supabase/migrations/20261017234700_official_parks_rec_facility_source_review.sql');
const sourceWorkbench=file('src/app/admin/runs/facility-sources/page.tsx');
describe('Official Virginia Parks & Recreation source expansion',()=>{
 it('imports official-source basketball places without invented court coordinates',()=>{
  expect(arlington).toContain('Arlington County Parks & Recreation');
  expect(arlington).toContain('Prince William County Parks & Recreation');
  expect(arlington).toContain('on conflict(slug) do nothing');
  expect(arlington).toContain('null,null');
  expect(arlington).toContain('Street address pending facility verification');
  expect(arlington).toContain('Basketball court or recreation-center gym appears');
  expect(additional).toContain('Hunton Community Center & Park');
  expect(additional).toContain('Shenandoah County Park');
  expect(additional).toContain('380 Park Lane, Maurertown, VA 22644');
  expect(additional).toContain('null,null');
 });
 it('exposes Arlington, Prince William and Shenandoah discovery without adding Weekend Circuit cities',()=>{
  for(const id of ['arlington','prince-william','shenandoah']){
   expect(world).toContain("id:'"+id+"'");
   expect(atlas).toContain(id);
  }
  expect(world).toContain('areaGateways={runsAreaOptions}');
  expect(world).toContain("if(!parksRecAreas.some(area=>area.id===next.id))chooseCity(next.id)");
  expect(localityNames({id:'prince-william',name:'Prince William',lat:38.67,lon:-77.45} as any)).toEqual(['Prince William']);
  expect(atlas).toContain("countyBounds(data,code)");
  expect(atlas).toContain("'51153'");
  expect(atlas).toContain("'51013'");
  expect(atlas).toContain("'51171'");
 });
 it('never turns official park records into false precision map pins or guaranteed bookings',()=>{
  const court:WorldCourt={slug:'arlington-pr-jennie-dean-park',name:'Jennie Dean Park',address:'Street address pending facility verification',locality:'Arlington',latitude:null,longitude:null,verification_status:'official',access_type:'public',venue_type:'outdoor',source_label:'Arlington County Parks & Recreation',source_url:'https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts',hours_text:null};
  expect(verifiedParksRecFacility(court)).toBe(true);
  expect(buildCourtMapPins([court],[])).toEqual([]);
  expect(arlington).toContain('does NOT guarantee open gym access');
  expect(additional).toContain('reservations may vary');
 });
 it('gives staff a complete official-jurisdiction coverage review rather than falsely claiming statewide completeness',()=>{
  expect(quality).toContain('/api/geo/virginia?layer=counties');
  expect(quality).toContain('Source needed');
  expect(quality).toContain('jurisdiction audit');
  expect(quality).toContain('officialLocalities');
 });
 it('allows staff to submit official government basketball evidence while keeping the verified directory protected',()=>{
  expect(sourceSql).toContain('rch_official_facility_reviews');
  expect(sourceSql).toContain('enable row level security');
  expect(sourceSql).toContain('public.is_staff_or_admin()');
  expect(sourceSql).toContain('rch_submit_official_basketball_facility');
  expect(sourceSql).toContain('rch_review_official_basketball_facility');
  expect(sourceSql).toContain("v_row.status<>'pending'");
  expect(sourceSql).toContain('null,null');
  expect(sourceSql).toContain("char_length(trim(p_reason)) not between 24 and 2000");
  expect(sourceSql).not.toContain('insert into public.rch_rep_wallets');
  expect(sourceWorkbench).toContain("db.rpc('is_staff_or_admin')");
  expect(sourceWorkbench).toContain("rch_submit_official_basketball_facility");
  expect(sourceWorkbench).toContain("rch_review_official_basketball_facility");
  expect(quality).toContain('/admin/runs/facility-sources');
 });
});
