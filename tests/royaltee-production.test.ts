import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROYALTEE_WORK_TEMPLATES, forRoyalteeEvent, dueDateForEvent, daysUntilDue, readiness } from '@/lib/royaltee-production';
import type { RoyalteeWorkItem } from '@/lib/royaltee-production';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const studio=read('src/components/RoyalteeShowProduction.tsx');
const dashboard=read('src/components/RoyalteeCoachDashboard.tsx');
const schema=read('supabase/migrations/20261015205000_royaltee_event_show_production.sql');

describe('Royaltee game-day workflow',()=>{
  it('has a consistent pregame-to-postgame checklist for every adult event',()=>{
    expect(ROYALTEE_WORK_TEMPLATES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ROYALTEE_WORK_TEMPLATES.map(t=>t.key)).size).toBe(ROYALTEE_WORK_TEMPLATES.length);
    expect(forRoyalteeEvent('game_day').some(t=>t.kind==='content'&&t.day_offset===1)).toBe(true);
    expect(forRoyalteeEvent('tryout').every(t=>t.scope==='all')).toBe(true);
    expect(forRoyalteeEvent('rehearsal').some(t=>t.title.includes('Safety'))).toBe(true);
    expect(forRoyalteeEvent('game_day').some(t=>t.title.includes('DJ'))).toBe(true);
    expect(ROYALTEE_WORK_TEMPLATES.every(t=>t.day_offset>=-30&&t.day_offset<=7)).toBe(true);
  });
  it('uses Eastern calendar dates across daylight saving changes',()=>{
    expect(dueDateForEvent('2026-03-08T16:00:00Z',-1)).toBe('2026-03-07');
    expect(dueDateForEvent('2026-11-01T20:00:00Z',1)).toBe('2026-11-02');
    expect(daysUntilDue('2026-11-01T20:00:00Z',0,new Date('2026-11-01T21:00:00Z'))).toBe(0);
  });
  it('does not claim show readiness from unchecked critical work',()=>{
    const item:RoyalteeWorkItem={id:'1',event_id:'2',template_key:'3',kind:'ops',day_offset:-1,
      priority:'critical',title:'Confirm',instructions:'Confirm',owner_label:'coach',status:'pending',
      notes:'',asset_url:'',rights_verified:false,editorial_approved:false,posted_at:null,updated_at:'now'};
    expect(readiness([item]).operationalReady).toBe(false);
    expect(readiness([{...item,status:'complete'}]).operationalReady).toBe(true);
  });
  it('keeps content rights approval and publishing separate',()=>{
    expect(schema).toContain('royaltee_content_release_gate');
    expect(schema).toContain('public.can_manage_royaltee()');
    expect(schema).toContain('enable row level security');
    expect(schema).not.toContain('to anon,authenticated;\ngrant select on public.rcl_royaltee_event_work_items to anon');
    expect(studio).toContain('ignoreDuplicates:true');
    expect(studio).toContain('rights_verified');
    expect(studio).toContain('editorial_approved');
    expect(studio).toContain('Record as published (manual)');
    expect(studio).toContain('.eq(\'updated_at\',row.updated_at)');
    expect(dashboard).toContain("setTab] = useState<'production'|'overview'");
    expect(dashboard).toContain('<RoyalteeShowProduction');
  });
});
