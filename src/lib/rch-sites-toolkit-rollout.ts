/** Server-only rollout gates for the RCH Sites basketball toolkit.
 * Never allow the broad server switch to silently grant access to every organization.
 * A pilot org must independently pass authenticated owner/manager checks.
 */
import 'server-only';
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function toolkitPilotOrganizationAllowed(orgId:unknown,env:NodeJS.ProcessEnv=process.env):boolean{
  if(env.RCH_SITES_TOOLKIT_ENABLED!=='true'||typeof orgId!=='string'||!id.test(orgId))
    return false;
  if(env.RCH_SITES_TOOLKIT_PUBLIC_LAUNCH_ENABLED==='true')return true;
  return (env.RCH_SITES_TOOLKIT_PILOT_ORG_IDS||'').split(',')
    .map(value=>value.trim().toLowerCase())
    .filter(value=>id.test(value))
    .includes(orgId.toLowerCase());
}
