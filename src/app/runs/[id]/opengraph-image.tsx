import {ImageResponse} from 'next/og';
import {getPublicClient} from '@/lib/public-data';

export const runtime='edge';
export const alt='Rich City Hoops Run card preview';
export const size={width:1200,height:630};
export const contentType='image/png';

type RunCardData={
 title:string|null;
 location:string|null;
 starts_at:string;
 game_format:string|null;
 skill_level:string|null;
 max_players:number|null;
 status:string;
 run_type:string|null;
 registeredPlayers:number|null;
 partnerExperience?:string|null;
 partnerPriceCents?:number|null;
};

function dateLabel(value:string){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'See details in the Run Room';
 return date.toLocaleString('en-US',{
  timeZone:'America/New_York',
  weekday:'short',
  month:'short',
  day:'numeric',
  hour:'numeric',
  minute:'2-digit',
 });
}

function statusLabel(run:RunCardData|null){
 if(!run)return 'Registration open';
 const isFull=run.status==='full'||(run.max_players!==null&&run.registeredPlayers!==null&&run.registeredPlayers>=run.max_players);
 if(isFull)return 'Full';
 if(run.status==='cancelled')return 'Cancelled';
 if(run.status==='completed')return 'Completed';
 return 'Registration open';
}

function runTypeLabel(value:string|null|undefined){
 if(value==='competitive')return 'Competitive run';
 if(value==='social')return 'Social meetup';
 if(value==='training')return 'Training';
 return 'Pickup run';
}

function experienceLabel(run:RunCardData|null){
 if(run?.partnerExperience==='rec')return 'THE REC';
 if(run?.partnerExperience==='park')return 'THE PARK';
 if(run?.run_type==='competitive')return 'COMPETITIVE';
 return 'COMMUNITY';
}

function imageText(value:string,max:number){
 const text=value.trim();
 return text.length>max?text.slice(0,max-1).trimEnd()+'…':text;
}

function createRunCard(run:RunCardData|null){
 const title=imageText(run?.title||'Find your next run',54);
 const location=imageText(run?.location||'Location in Run Room',68);
 const when=run?dateLabel(run.starts_at):'Find a basketball run near you';
 const skill=(run?.skill_level||'all').replace(/[_-]+/g,' ').toLowerCase();
 const format=(run?.game_format||'pickup').toUpperCase();
 const status=statusLabel(run);
 const statusTone=status==='Full'||status==='Cancelled'||status==='Completed'?'#383838':'#353535';
 const count=run?.registeredPlayers??0;
 const maxPlayers=run?.max_players;
 const occupancy=maxPlayers?count+' / '+maxPlayers+' registered':'Open run';
 const openSpots=maxPlayers&&status==='Registration open'
  ?Math.max(0,maxPlayers-count)+' open '+(maxPlayers-count===1?'spot':'spots')+' · Solo RSVP'
  :null;
 const runType=runTypeLabel(run?.run_type);
 const partnerPrice=run?.partnerPriceCents===0?'Free session'
  :run?.partnerPriceCents?('$'+(run.partnerPriceCents/100).toFixed(2)+' · pay organizer'):null;
 const titleSize=title.length>34?54:68;

 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#090909',backgroundImage:'radial-gradient(ellipse at 50% 0%,rgba(105,105,105,.22),transparent 58%),linear-gradient(145deg,#0b0b0b,#151515 56%,#090909)',color:'#f5f5f5',fontFamily:'Arial, Helvetica, sans-serif'}}>
   <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid #464646',borderRadius:22,backgroundImage:'linear-gradient(155deg,#242424,#171717 55%,#121212 100%)',boxShadow:'0 14px 38px rgba(0,0,0,.42)'}}>
    <div style={{position:'relative',height:196,display:'flex',flexDirection:'column',justifyContent:'space-between',overflow:'hidden',padding:'25px 34px 26px',borderBottom:'1px solid #424242',backgroundImage:'radial-gradient(ellipse at 85% 12%,rgba(220,220,220,.18),transparent 56%),linear-gradient(160deg,#242424,#1a1a1a)'}}>
     <div style={{position:'absolute',right:-22,bottom:-120,width:275,height:275,border:'2px solid rgba(255,255,255,.12)',borderRadius:999,boxShadow:'0 0 0 42px rgba(255,255,255,.025),0 0 0 84px rgba(255,255,255,.02)'}}/>
     <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20}}>
      <div style={{display:'flex',alignItems:'center',gap:12,fontSize:26,fontWeight:900,letterSpacing:3,color:'#dedede'}}>{experienceLabel(run)} <span style={{color:'#888'}}>·</span> {format}</div>
      <div style={{display:'flex',alignItems:'center',padding:'9px 16px',border:'1px solid #777',borderRadius:10,backgroundColor:statusTone,color:'#f0f0f0',fontSize:21,fontWeight:850,whiteSpace:'nowrap'}}>{status}</div>
     </div>
     <div style={{position:'relative',display:'flex',maxWidth:1030,overflow:'hidden',fontSize:titleSize,lineHeight:1.04,fontWeight:900,letterSpacing:-1.7,color:'#fff'}}>{title}</div>
    </div>
    <div style={{display:'flex',flex:1,flexDirection:'column',justifyContent:'space-between',padding:'20px 34px 22px'}}>
     <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',alignItems:'center',gap:15,color:'#e0e0e0',fontSize:26,fontWeight:700}}>
       <div style={{width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #626262',borderRadius:9,backgroundColor:'#292929',color:'#d7d7d7',fontSize:22}}>◷</div>
       <div>{when}</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:15,color:'#d0d0d0',fontSize:25,fontWeight:600}}>
       <div style={{width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #626262',borderRadius:9,backgroundColor:'#292929',color:'#d7d7d7',fontSize:22}}>⌖</div>
       <div>{location}</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:15,color:'#bdbdbd',fontSize:23,fontWeight:600}}>
       <div style={{width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #626262',borderRadius:9,backgroundColor:'#292929',color:'#d7d7d7',fontSize:20}}>♟</div>
       <div>{occupancy}</div>
      </div>
     </div>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:18}}>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
       <div style={{color:'#d0d0d0',fontSize:21,fontWeight:750}}>{skill} · {runType}</div>
       <div style={{color:'#bcbcbc',fontSize:20,fontWeight:700}}>{openSpots||partnerPrice||'Run details in the room'}</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
       <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:58,padding:'0 24px',borderRadius:12,backgroundColor:'#e3e3e3',color:'#171717',fontSize:24,fontWeight:900}}>VIEW RUN <span style={{fontSize:28}}>→</span></div>
       <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:56,padding:'0 18px',border:'1px solid #666',borderRadius:12,backgroundColor:'#202020',color:'#e1e1e1',fontSize:21,fontWeight:850}}>SHARE</div>
      </div>
     </div>
    </div>
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
   const result=await client.from('runs')
    .select('title,location,starts_at,game_format,skill_level,max_players,status,run_type')
    .eq('id',id).maybeSingle();
   if(!result.error&&result.data){
    const [playersResult,partnerResult]=await Promise.all([
     client.from('run_players').select('profile_id').eq('run_id',id),
     client.from('rch_runs_partner_sessions').select('experience,price_cents').eq('run_id',id).limit(1).maybeSingle(),
    ]);
    run={
     ...result.data,
     registeredPlayers:playersResult.error?null:(playersResult.data??[]).length,
     partnerExperience:partnerResult.error?null:partnerResult.data?.experience??null,
     partnerPriceCents:partnerResult.error?null:partnerResult.data?.price_cents??null,
    } as RunCardData;
   }
  }catch{
   run=null;
  }
 }
 return createRunCard(run);
}
