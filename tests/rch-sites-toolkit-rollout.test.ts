import {describe,it,expect} from 'vitest';
import {toolkitPilotOrganizationAllowed} from '../src/lib/rch-sites-toolkit-rollout';
const first='f2900000-0000-4000-8000-000000000001';
const second='f2900000-0000-4000-8000-000000000002';
describe('RCH Sites pilot rollout gate',()=>{
  it('fails closed without the server rollout switch',()=>{
    expect(toolkitPilotOrganizationAllowed(first,{})).toBe(false);
    expect(toolkitPilotOrganizationAllowed(first,{RCH_SITES_TOOLKIT_ENABLED:'false',
      RCH_SITES_TOOLKIT_PILOT_ORG_IDS:first})).toBe(false);
  });
  it('fails closed with the global switch but no pilot organizations',()=>{
    expect(toolkitPilotOrganizationAllowed(first,{RCH_SITES_TOOLKIT_ENABLED:'true'})).toBe(false);
    expect(toolkitPilotOrganizationAllowed(first,{RCH_SITES_TOOLKIT_ENABLED:'true',
      RCH_SITES_TOOLKIT_PILOT_ORG_IDS:'none'})).toBe(false);
  });
  it('allows only exact verified-format UUIDs in an explicit pilot list',()=>{
    const environment={RCH_SITES_TOOLKIT_ENABLED:'true',
      RCH_SITES_TOOLKIT_PILOT_ORG_IDS:'  '+first+' , '+second.toUpperCase()+'  '};
    expect(toolkitPilotOrganizationAllowed(first,environment)).toBe(true);
    expect(toolkitPilotOrganizationAllowed(second,environment)).toBe(true);
    expect(toolkitPilotOrganizationAllowed('f2900000-0000-4000-8000-000000000003',environment)).toBe(false);
    expect(toolkitPilotOrganizationAllowed('f2900000-0000-4000-8000-00000000000',environment)).toBe(false);
  });
  it('requires an independent explicit public launch switch for all organizations',()=>{
    expect(toolkitPilotOrganizationAllowed(first,{RCH_SITES_TOOLKIT_ENABLED:'true',
      RCH_SITES_TOOLKIT_PUBLIC_LAUNCH_ENABLED:'true'})).toBe(true);
    expect(toolkitPilotOrganizationAllowed(first,{RCH_SITES_TOOLKIT_ENABLED:'false',
      RCH_SITES_TOOLKIT_PUBLIC_LAUNCH_ENABLED:'true'})).toBe(false);
  });
});
