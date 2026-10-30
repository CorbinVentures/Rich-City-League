import { describe, expect, it } from 'vitest';
import { inspectRclPilotReadiness, RCL_PILOT_OPERATIONS, type RclOperationsSnapshot } from '../src/lib/rcl-operations-readiness';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const clubIds = Array.from({length:6},(_,i)=>`club-${i+1}`);
const season = {id:'2027-season',start_date:'2027-11-13',status:'draft'};
const assignments = clubIds.map(team_id=>({team_id,team_season_id:`season-${team_id}`,active:true}));
const fixtures = clubIds.flatMap((home,i)=>clubIds.slice(i+1).flatMap(away=>[
  {home_team_id:home,away_team_id:away},
  {home_team_id:away,away_team_id:home},
]));

const ready: RclOperationsSnapshot = {
  season,
  assignedClubs:assignments,
  activeRosters:[{player_id:'prospect-1',team_season_id:'season-club-1'}],
  scheduledGames:fixtures,
  eligibleDraftProspects:24,
  draft:{status:'SETUP',rounds:4,roster_limit:12},
  draftPreflightBlockers:[],
};

describe('2027–28 professional league operational preflight',()=>{
  it('keeps a six-club, ten-game home/away plan clearly proposed',()=>{
    expect(RCL_PILOT_OPERATIONS.status).toBe('recommended');
    expect(RCL_PILOT_OPERATIONS.clubs).toBe(6);
    expect(RCL_PILOT_OPERATIONS.regularSeasonGamesTotal).toBe(30);
    const result=inspectRclPilotReadiness(ready);
    expect(result.clearTechnicalPreflight).toBe(true);
    expect(result.checks.every(check=>check.passed)).toBe(true);
    expect(result.requiredManualApprovals).toHaveLength(6);
  });
  it('never treats missing official season data as an approved competition',()=>{
    const result=inspectRclPilotReadiness({season:null,assignedClubs:[],activeRosters:[],scheduledGames:[],eligibleDraftProspects:0,draft:null,draftPreflightBlockers:null});
    expect(result.clearTechnicalPreflight).toBe(false);
    expect(result.checks.find(check=>check.id==='roster-integrity')?.passed).toBe(false);
    expect(result.checks.find(check=>check.id==='season')?.passed).toBe(false);
  });
  it('flags duplicate active player memberships',()=>{
    const result=inspectRclPilotReadiness({...ready,activeRosters:[
      {player_id:'p1',team_season_id:'season-club-1'},
      {player_id:'p1',team_season_id:'season-club-2'},
    ]});
    expect(result.duplicatePlayerIds).toEqual(['p1']);
    expect(result.clearTechnicalPreflight).toBe(false);
  });
  it('rejects a fixture list with both games assigned to the same home team',()=>{
    const wrong=fixtures.map(game=>({...game}));
    wrong[1]={...wrong[0]};
    const result=inspectRclPilotReadiness({...ready,scheduledGames:wrong});
    expect(result.checks.find(check=>check.id==='schedule')?.passed).toBe(false);
  });
  it('keeps official games and draft activation contingent on actual season records',()=>{
    const result=inspectRclPilotReadiness({...ready,eligibleDraftProspects:23});
    expect(inspectRclPilotReadiness({...ready,draftPreflightBlockers:['Draft order not complete']}).clearTechnicalPreflight).toBe(false);
    expect(inspectRclPilotReadiness({...ready,draftPreflightBlockers:null}).checks.find(check=>check.id==='draft')?.passed).toBe(false);
    expect(result.checks.find(check=>check.id==='draft')?.passed).toBe(false);
    const page=readFileSync(join(process.cwd(),'src/app/admin/league-readiness/page.tsx'),'utf8');
    expect(page).toContain('NOT APPROVED FOR OPENING NIGHT');
    expect(page).toContain('clearTechnicalPreflight');
    expect(readFileSync(join(process.cwd(),'src/app/admin/operations/page.tsx'),'utf8')).toContain('/admin/league-readiness');
  });
});
