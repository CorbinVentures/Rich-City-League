import type { MetadataRoute } from 'next';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';

const SITE='https://richcityhoops.com';
const PUBLIC_LAUNCH=Date.UTC(2026,9,1);
const core=[
  ['',1,'daily'],['/about',.9,'monthly'],['/richmond-basketball-league',1,'weekly'],['/richmond-basketball-runs',.9,'daily'],['/news',.9,'daily'],['/players',.9,'daily'],['/teams',.9,'daily'],['/games',.9,'daily'],['/standings',.85,'daily'],['/leaderboards',.85,'daily'],['/schedule',.85,'daily'],['/stats',.8,'daily'],['/runs',.8,'daily'],['/communities',.75,'daily'],['/fantasy',.75,'weekly'],['/draft',.7,'weekly'],['/media',.7,'weekly'],['/faq',.7,'monthly'],['/register',.95,'weekly'],['/join',.7,'monthly']
] as const;

export const dynamic='force-dynamic';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const now=new Date();
 // Keep private-beta URLs out of discovery until the public launch.
 if(Date.now()<PUBLIC_LAUNCH) return [];
 const entries:MetadataRoute.Sitemap=core.map(([path,priority,changeFrequency])=>({url:`${SITE}${path}`,lastModified:now,priority,changeFrequency}));
 try{
  const [{teams,news},client]=await Promise.all([getLeagueSnapshot(),Promise.resolve(getPublicClient())]);
  for(const team of teams) if(team.slug) entries.push({url:`${SITE}/teams/${team.slug}`,lastModified:now,changeFrequency:'weekly',priority:.7});
  for(const item of news) if(item.slug) entries.push({url:`${SITE}/news/${item.slug}`,lastModified:item.published_at?new Date(item.published_at):now,changeFrequency:'monthly',priority:.75});
  if(client){const {data}=await client.from('public_players').select('id').eq('is_active',true).limit(1000);for(const player of data??[]) entries.push({url:`${SITE}/players/${player.id}`,lastModified:now,changeFrequency:'weekly',priority:.65});}
 }catch{}
 return entries;
}
