import {ImageResponse} from 'next/og';
import {getPublicClient} from '@/lib/public-data';

export const runtime='edge';
export const alt='Rich City Hoops basketball Run card';
export const size={width:1200,height:630};
export const contentType='image/png';

type RunCardData={
 title:string|null;
 location:string|null;
 court_name?:string|null;
 starts_at:string;
 game_format:string|null;
 status:string;
};

function dateLabel(value:string){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'See details in the Run Room';
 return date.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
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
 const location=imageText(run?.court_name||run?.location||'Location in Run Room',34);
 const when=run?dateLabel(run.starts_at):'Find a basketball run near you';
 const format=(run?.game_format||'PICKUP BASKETBALL').toUpperCase();
 const status=runStatus(run?.status);
 const titleSize=title.length>30?46:title.length>21?54:66;
 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'44px 58px',backgroundColor:'#090b0f',color:'#ffffff',fontFamily:'Arial, sans-serif',position:'relative',overflow:'hidden'}}>
   <div style={{position:'absolute',top:0,left:0,width:'100%',height:10,backgroundColor:'#5bbbff'}}/>
   <div style={{position:'absolute',top:110,right:-150,width:450,height:450,borderRadius:225,border:'2px solid #18324a',opacity:0.7}}/>
   <div style={{position:'absolute',top:155,right:-105,width:360,height:360,borderRadius:180,border:'2px solid #142638',opacity:0.8}}/>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:1}}>
    <div style={{display:'flex',alignItems:'center',gap:18}}>
     <div style={{width:74,height:66,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:15,backgroundColor:'#ffffff',color:'#090b0f',fontSize:31,fontWeight:900,fontStyle:'italic'}}>RCH</div>
     <div style={{display:'flex',flexDirection:'column',gap:5}}>
      <div style={{fontSize:26,fontWeight:900,letterSpacing:3}}>RICH CITY HOOPS</div>
      <div style={{fontSize:17,fontWeight:800,letterSpacing:4,color:'#5bbbff'}}>RUNS · REAL BASKETBALL</div>
     </div>
    </div>
    <div style={{display:'flex',alignItems:'center',padding:'11px 17px',borderRadius:12,border:'1px solid #33414c',color:'#c7d5e2',fontSize:16,fontWeight:900,letterSpacing:2}}>RUN CARD</div>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:12,zIndex:1,marginTop:6}}>
    <div style={{display:'flex',alignItems:'center',gap:12,color:'#5bbbff',fontSize:18,fontWeight:900,letterSpacing:3}}>
     <div style={{width:9,height:9,borderRadius:5,backgroundColor:'#5bbbff'}}/>
     <div>{format} · PICKUP RUN</div>
    </div>
    <div style={{maxWidth:1030,fontSize:titleSize,fontWeight:900,lineHeight:1.02,letterSpacing:-1.5}}>{title}</div>
    <div style={{fontSize:21,color:'#aeb8c1'}}>Pull up, play, and find your place in the RCH community.</div>
   </div>
   <div style={{display:'flex',gap:15,zIndex:1}}>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:9,padding:'16px 20px',borderRadius:14,border:'1px solid #303841',backgroundColor:'#11161b'}}>
     <div style={{fontSize:14,fontWeight:900,letterSpacing:3,color:'#788693'}}>WHEN</div>
     <div style={{fontSize:23,fontWeight:800}}>{when}</div>
    </div>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:9,padding:'16px 20px',borderRadius:14,border:'1px solid #303841',backgroundColor:'#11161b'}}>
     <div style={{fontSize:14,fontWeight:900,letterSpacing:3,color:'#788693'}}>WHERE</div>
     <div style={{fontSize:23,fontWeight:800}}>{location}</div>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px',borderRadius:14,backgroundColor:'#5bbbff',color:'#07111a',fontSize:16,fontWeight:900,letterSpacing:1}}>{status}</div>
   </div>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid #27313a',paddingTop:14,zIndex:1}}>
    <div style={{fontSize:16,fontWeight:900,letterSpacing:2,color:'#c6d0d8'}}>VIRGINIA BASKETBALL COMMUNITY</div>
    <div style={{fontSize:16,fontWeight:900,letterSpacing:2,color:'#5bbbff'}}>RICHCITYHOOPS.COM</div>
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
   const result=await client.from('runs').select('title,location,court_name,starts_at,game_format,status').eq('id',id).maybeSingle();
   if(!result.error&&result.data)run=result.data as RunCardData;
  }catch{
   run=null;
  }
 }
 return createRunCard(run);
}