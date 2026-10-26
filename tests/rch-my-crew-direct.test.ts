import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

const runs=read('src/app/runs/page.tsx');
const crews=read('src/app/crews/page.tsx');
const commonwealth=read('src/components/commonwealth/CommonwealthExperience.tsx');
const creator=read('src/components/crews/CrewCreatorFlow.tsx');

describe('My Crew shortcut direct navigation',()=>{
  it('uses a member-specific destination, not the public directory',()=>{
    expect(runs).toContain('href="/crews?intent=mine"');
    expect(runs).toContain('Open my crew dashboard or create a crew');
    expect(crews).toContain("params.get('intent')==='mine'?<MyCrewGateway/>:<CrewsView/>");
  });

  it('checks server-authorized membership before choosing the destination',()=>{
    expect(crews).toContain(".eq('profile_id',user.id)");
    expect(crews).toContain("if(membership.error)throw membership.error;");
    expect(crews).toContain(".eq('captain_id',user.id)");
    expect(crews).toContain("if(captain.error)throw captain.error;");
    expect(crews).toContain("router.replace(crewId");
    expect(crews).toContain("'/crews?crew='+encodeURIComponent(crewId)+'#rch-crew-hq'");
    expect(crews).toContain("'/crews?create=1#rch-crew-create'");
    expect(crews).toContain('We could not check your crew membership.');
  });

  it('opens the direct visual creator while retaining the existing Commonwealth flow',()=>{
    expect(crews).toContain('<CrewCreatorFlow');
    expect(creator).toContain("db.rpc('commonwealth_found_crew'");
    expect(creator).toContain('saveCrewLogo');
    expect(creator).toContain("router.replace('/crews?crew='");
    expect(commonwealth).toContain("new URLSearchParams(window.location.search).get('found')!=='1'");
    expect(commonwealth).toContain("setFoundingOpen(true)");
    expect(commonwealth).toContain("id=\"rch-cw-my-crew\"");
    expect(commonwealth).toContain("db.rpc('commonwealth_found_crew'");
    expect(commonwealth).toContain("router.replace('/crews?crew='+encodeURIComponent(crewId as string)+'#rch-crew-hq')");
  });

  it('does not depend on the first 250 directory crews or 3000 members',()=>{
    expect(crews).toContain("selectedCrewResult");
    expect(crews).toContain("ownMemberResult");
    expect(crews).toContain(".eq('id',selectedId).maybeSingle()");
    expect(crews).toContain(".eq('crew_id',selectedId).limit(12)");
    expect(crews).toContain("if(requested&&!current.some(c=>c.id===requested.id))current.unshift(requested);");
  });
});
