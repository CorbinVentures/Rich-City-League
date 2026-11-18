import type {Metadata} from 'next';
import {getPublicClient} from '@/lib/public-data';

type Props={children:React.ReactNode;params:Promise<{id:string}>};

export async function generateMetadata({params}:Omit<Props,'children'>):Promise<Metadata>{
 const {id}=await params;
 const fallback='Find this basketball Run on Rich City Hoops. Join the community, find open spots, and play.';
 const url='https://www.richcityhoops.com/runs/'+encodeURIComponent(id);
 const cardImage={url:url+'/opengraph-image?v=run-card-v1',width:1200,height:630,alt:'Rich City Hoops Run card'};
 const shareMetadata=(title:string,description:string):Metadata=>({
  title,description,
  openGraph:{title,description,type:'website',url,siteName:'Rich City Hoops',images:[cardImage]},
  twitter:{card:'summary_large_image',title,description,images:[cardImage.url]},
 });
 const db=getPublicClient();
 if(!db)return shareMetadata('RCH Runs',fallback);
 const {data,error}=await db.from('runs')
  .select('id,title,location,starts_at,game_format,status')
  .eq('id',id).maybeSingle();
 if(error)return shareMetadata('RCH Runs',fallback);
 // A confirmed missing Run must not become an indexable generic detail page.
 if(!data)return {title:'Run not found | RCH Runs',description:fallback,robots:{index:false,follow:false}};
 const start=new Date(data.starts_at);
 const when=Number.isFinite(start.getTime())?start.toLocaleString('en-US',{
  timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
 }):'See details';
 const title=(data.title||'Basketball Run')+' | RCH Runs';
 const description=(data.game_format||'Basketball')+' basketball · '+when+' · '+(data.location||'Virginia')+'. '+(data.status==='open'?'See the roster and claim an open spot.':'See Run details and status.');
 return {...shareMetadata(title,description),alternates:{canonical:url}};
}

export default function RunLayout({children}:Props){return children;}