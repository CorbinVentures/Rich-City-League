import {NextResponse} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {isRchSiteSlug} from '@/lib/rch-site-builder';
import {parseToolkitTeams,parseToolkitGames} from '@/lib/rch-sites-free-toolkit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,
  {status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
  if(process.env.RCH_SITES_TOOLKIT_ENABLED!=='true')return reply({error:'Not available'},404);
  const slug=new URL(request.url).searchParams.get('slug');
  if(!isRchSiteSlug(slug))return reply({error:'Schedule not found'},404);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return reply({error:'Not available'},503);
  const {data:site,error}=await admin.from('rch_sites').select('organization_id')
    .eq('slug',slug).eq('status','published').maybeSingle();
  if(error||!site)return reply({error:'Schedule not found'},404);
  const [{data:org,error:orgError},{data:toolkit,error:toolError}]=await Promise.all([
    admin.from('network_organizations').select('name,status,is_claimed,is_verified,network_tier')
      .eq('id',site.organization_id).maybeSingle(),
    admin.from('rch_site_toolkit').select('schedule_public,teams,games,revision,updated_at')
      .eq('organization_id',site.organization_id).maybeSingle(),
  ]);
  if(orgError||toolError||!org||!org.is_claimed||!org.is_verified||org.status!=='active'
    ||org.network_tier==='flagship'||!toolkit?.schedule_public)
    return reply({error:'Schedule not published'},404);
  try{
    const teams=parseToolkitTeams(toolkit.teams);
    const games=parseToolkitGames(toolkit.games,teams);
    const names=new Map(teams.map(t=>[t.id,t.name]));
    return reply({organizationName:org.name,updatedAt:toolkit.updated_at,
      games:games.map(g=>({id:g.id,date:g.date,time:g.time,court:g.court,
        home:names.get(g.homeId),away:names.get(g.awayId)}))});
  }catch{return reply({error:'Schedule unavailable'},503);}
}
