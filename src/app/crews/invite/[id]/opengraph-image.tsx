import {ImageResponse} from 'next/og';
import {loadCrewInvite} from '@/lib/crew-invite';

export const runtime = 'edge';
export const alt = 'Rich City Hoops Crew invitation preview';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';
type Props = {params: Promise<{id: string}>};

function fitText(value: string, limit: number) {
 const text = value.trim();
 return text.length > limit ? text.slice(0, limit - 1).trimEnd() + '…' : text;
}

export default async function CrewInviteImage({params}: Props) {
 const {id} = await params;
 const result = await loadCrewInvite(id);
 const crew = result.status === 'found' ? result.crew : null;
 const name = fitText(crew?.name || 'RCH Crews', 46);
 const city = fitText(crew?.city || 'Virginia', 34);
 const motto = fitText(crew?.motto || 'Build your crew. Run your court. Earn your name.', 95);
 const court = crew?.homeCourt ? fitText(crew.homeCourt.replace(/-/g, ' '), 42) : null;
 const titleSize = name.length > 29 ? 55 : 76;

 return new ImageResponse(
  <div style={{display:'flex',width:'100%',height:'100%',padding:24,background:'#050b11',backgroundImage:'radial-gradient(ellipse at 90% 0%,#1f4560 0%,transparent 55%),linear-gradient(145deg,#07121d,#111922)',fontFamily:'Arial, Helvetica, sans-serif',color:'#f7fbff'}}>
   <div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',overflow:'hidden',borderRadius:24,border:'2px solid #577e9a',backgroundImage:'radial-gradient(ellipse at 90% 15%,#254b67 0%,transparent 44%),linear-gradient(145deg,#1a344c,#0b1b2b 65%,#111923)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'27px 34px',borderBottom:'1px solid #456f8e'}}>
     <div style={{display:'flex',alignItems:'center',gap:15,fontWeight:900,fontSize:24,letterSpacing:3,color:'#b8daef'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:45,height:45,border:'2px solid #a9d5f0',borderRadius:11,color:'#f1faff',fontSize:23}}>R</div>
      RCH CREWS
     </div>
     <div style={{display:'flex',border:'1px solid #7496ae',background:'#1a3b52',padding:'10px 15px',borderRadius:10,fontSize:18,fontWeight:900,letterSpacing:2}}>OFFICIAL CREW INVITE</div>
    </div>
    <div style={{display:'flex',alignItems:'center',flex:1,gap:34,padding:'24px 38px'}}>
     <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:190,height:190,flexShrink:0,overflow:'hidden',borderRadius:25,border:'3px solid #86b4d1',background:'#0a1c2b',boxShadow:'0px 12px 35px #0007'}}>
      {crew?.logoUrl
       ? <img src={crew.logoUrl} alt="" width={174} height={174} style={{objectFit:'contain'}}/>
       : <div style={{display:'flex',fontSize:74,fontWeight:900,color:'#bfe3f6'}}>{name.slice(0,2).toUpperCase()}</div>}
     </div>
     <div style={{display:'flex',flexDirection:'column',flex:1,justifyContent:'center',minWidth:0}}>
      <div style={{display:'flex',fontSize:22,fontWeight:900,letterSpacing:4,color:'#a8d5ee'}}>YOU ARE INVITED TO JOIN</div>
      <div style={{display:'flex',fontWeight:900,fontSize:titleSize,lineHeight:1.04,letterSpacing:-1.5,marginTop:12,overflow:'hidden',maxHeight:168,wordBreak:'break-word'}}>{name.toUpperCase()}</div>
      <div style={{display:'flex',marginTop:17,fontSize:26,fontWeight:700,color:'#c5e0ef'}}>{city}{court ? '  ·  ' + court : ''}</div>
     </div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:15,padding:'21px 36px 23px',borderTop:'1px solid #436c8a',background:'#0b1d2d'}}>
     <div style={{display:'flex',fontSize:24,fontWeight:700,color:'#dfebf2'}}>{motto}</div>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:20}}>
      <div style={{display:'flex',fontSize:20,fontWeight:800,letterSpacing:1,color:'#96c2de'}}>RUNS  ·  CREWS  ·  COMMONWEALTH CUP</div>
      <div style={{display:'flex',padding:'12px 22px',borderRadius:10,background:'#b5dcf5',color:'#071b2a',fontSize:21,fontWeight:900}}>VIEW CREW &amp; REQUEST TO JOIN</div>
     </div>
    </div>
   </div>
  </div>,
  size
 );
}
