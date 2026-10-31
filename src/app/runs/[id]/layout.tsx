import type {Metadata} from 'next';
import {getPublicClient} from '@/lib/public-data';

type Props={children:React.ReactNode;params:Promise<{id:string}>};

export async function generateMetadata({params}:Omit<Props,'children'>):Promise<Metadata>{
 const {id}=await params;
 const fallback='Find this basketball Run on Rich City Hoops. Join the community, find open spots, and play.';
 const db=getPublicClient();
 if(!db)return {title:'RCH Runs',description:fallback};
 const {data,error}=await db.from('runs')
  .select('id,title,location,starts_at,game_format,status')
  .eq('id',id).maybeSingle();
 if(error||!data)return {title:'RCH Runs',description:fallback};
 const start=new Date(data.starts_at);
 const when=Number.isFinite(start.getTime())?start.toLocaleString('en-US',{
  timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
 }):'See details';
 const title=`${data.title} | RCH Runs`;
 const description=`${data.game_format} basketball · ${when} · ${data.location}. ${data.status==='open'?'See the roster and claim an open spot.':'See Run details and status.'}`;
 const url=`https://www.richcityhoops.com/runs/${encodeURIComponent(id)}`;
 return {title,description,alternates:{canonical:url},
  openGraph:{title,description,type:'website',url,siteName:'Rich City Hoops'},
  twitter:{card:'summary_large_image',title,description}};
}

export default function RunLayout({children}:Props){return children;}
