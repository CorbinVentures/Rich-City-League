import {ImageResponse} from 'next/og';
import {getPublicClient} from '@/lib/public-data';

export const runtime='edge';
export const alt='Rich City Hoops Run Room preview';
export const size={width:1200,height:630};
export const contentType='image/png';

type RunCardData={
 title:string|null;
 description:string|null;
 location:string|null;
 court_name?:string|null;
 starts_at:string;
 game_format:string|null;
 skill_level:string|null;
 max_players:number|null;
 status:string;
};

function dateLabel(value:string){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'See details in the Run Room';
 const datePart=date.toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'});
 const timePart=date.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
 return datePart+' at '+timePart;
}

function runStatus(value?:string){
 if(value==='open')return 'SPOTS AVAILABLE';
 if(value==='full')return 'ROSTER FULL';
 if(value==='cancelled')return 'CANCELLED';
 if(value==='completed')return 'COMPLETED';
 if(value==='in_progress')return 'IN PROGRESS';
 return 'RUN DETAILS';
}

function imageText(value:string,max:number){
 const text=value.trim();
 return text.length>max?text.slice(0,max-1).trimEnd()+'…':text;
}

function createRunCard(run:RunCardData|null){
 const title=imageText(run?.title||'Find your next run',38);
 const description=imageText(run?.description?.trim()||'Find your next basketball run in the RCH community.',76);
 const location=imageText(run?.court_name||run?.location||'Location in Run Room',38);
 const when=run?dateLabel(run.starts_at):'Find a basketball run near you';
 const skill=(run?.skill_level||'all').replace(/[_-]+/g,' ').toLowerCase();
 const format=(run?.game_format||'pickup').toLowerCase();
 const gameSummary=skill+' · '+format+(run?.max_players?' · up to '+run.max_players:'');
 const status=runStatus(run?.status);
 const titleSize=title.length>30?46:title.length>22?56:70;
 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',backgroundColor:'#0a0a0a',color:'#f5f5f5',fontFamily:'Arial, Helvetica, sans-serif',position:'relative',overflow:'hidden'}}>
   <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(ellipse at 62% 7%, rgba(150,150,150,.27) 0%, rgba(70,70,70,.12) 34%, transparent 66%), linear-gradient(135deg,#0a0a0a 0%,#191919 48%,#090909 100%)'}}/>
   <div style={{height:82,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',backgroundColor:'#080808',borderBottom:'1px solid #393939',zIndex:1}}>
    <div style={{display:'flex',alignItems:'center',gap:18}}>
     <div style={{fontFamily:'Impact, Arial Black, sans-serif',fontSize:45,fontWeight:900,fontStyle:'italic',letterSpacing:-3,color:'#e3e3e3'}}>RCH</div>
     <div style={{width:1,height:40,backgroundColor:'#454545'}}/>
     <div style={{fontSize:16,fontWeight:900,letterSpacing:3,color:'#c8c8c8'}}>RICH CITY HOOPS</div>
    </div>
    <div style={{display:'flex',alignItems:'center',padding:'10px 16px',borderRadius:10,border:'1px solid #424242',color:'#c9c9c9',fontSize:14,fontWeight:900,letterSpacing:2}}>RCL RUNS</div>
   </div>
   <div style={{display:'flex',flex:1,flexDirection:'column',justifyContent:'center',gap:14,padding:'24px 48px 20px',zIndex:1}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
     <div style={{fontSize:15,fontWeight:900,letterSpacing:4,color:'#c5c5c5'}}>RCL RUNS</div>
     <div style={{display:'flex',alignItems:'center',padding:'8px 13px',borderRadius:9,border:'1px solid #4a4a4a',color:'#d1d1d1',fontSize:13,fontWeight:900,letterSpacing:1.5}}>{status}</div>
    </div>
    <div style={{display:'flex',alignItems:'baseline',gap:20,width:'100%'}}>
     <div style={{maxWidth:940,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',fontFamily:'Impact, Arial Black, sans-serif',fontSize:titleSize,fontWeight:900,fontStyle:'italic',lineHeight:.95,letterSpacing:-1.2,color:'#ffffff'}}>{title}</div>
     <div style={{whiteSpace:'nowrap',fontSize:23,fontWeight:600,color:'#bdc9d8'}}>Run Room</div>
    </div>
    <div style={{fontSize:22,color:'#d0d0d0'}}>{description}</div>
    <div style={{display:'flex',flexDirection:'column',gap:11,marginTop:7,padding:'18px 24px',border:'1px solid #414141',borderRadius:19,backgroundImage:'radial-gradient(ellipse at 60% 0%,#292929 0%,transparent 58%),linear-gradient(145deg,#171717 0%,#111111 70%,#0d0d0d 100%)',boxShadow:'inset 0 1px rgba(255,255,255,.08)'}}>
     <div style={{display:'flex',alignItems:'center',gap:11,color:'#d9d9d9',fontSize:17,fontWeight:900,letterSpacing:2.2}}>
      <div style={{width:11,height:11,borderRadius:6,backgroundColor:'#cfcfcf'}}/>
      <div>{location.toUpperCase()}</div>
     </div>
     <div style={{fontSize:27,fontWeight:850,color:'#f3f3f3'}}>{when}</div>
     <div style={{fontSize:19,color:'#b8b8b8'}}>{gameSummary}</div>
    </div>
   </div>
   <div style={{height:48,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',borderTop:'1px solid #333333',backgroundColor:'#0a0a0a',zIndex:1}}>
    <div style={{fontSize:13,fontWeight:900,letterSpacing:2,color:'#bdbdbd'}}>RCH RUN ROOM</div>
    <div style={{fontSize:13,fontWeight:900,letterSpacing:2,color:'#c9c9c9'}}>RICHCITYHOOPS.COM</div>
   </div>
  </div>,
  size,
 );
}

export default async function Image({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 let run:RunCardData|null=null;
 const client=getPublicClient() as any;
 if(client){
  try{
   const result=await client.from('runs').select('title,description,location,court_name,starts_at,game_format,skill_level,max_players,status').eq('id',id).maybeSingle();
   if(!result.error&&result.data)run=result.data as RunCardData;
  }catch{
   run=null;
  }
 }
 return createRunCard(run);
}