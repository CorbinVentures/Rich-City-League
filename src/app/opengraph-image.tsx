import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rich City League — More Than A League';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',position:'relative',overflow:'hidden',background:'#05080d',color:'white',fontFamily:'Arial, sans-serif'}}>
      <div style={{position:'absolute',inset:0,display:'flex',background:'linear-gradient(135deg,#05080d 0%,#0b1624 55%,#111827 100%)'}} />
      <div style={{position:'absolute',right:-80,bottom:-170,width:560,height:560,border:'28px solid rgba(245,158,11,.14)',borderRadius:999,display:'flex'}} />
      <div style={{position:'absolute',right:120,bottom:-70,width:300,height:300,border:'8px solid rgba(255,255,255,.06)',borderRadius:999,display:'flex'}} />
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:18,background:'#f59e0b',display:'flex'}} />
      <div style={{position:'relative',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'62px 74px',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:24}}>
          <div style={{width:86,height:86,border:'4px solid #f59e0b',borderRadius:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,fontWeight:900,color:'#f59e0b'}}>R</div>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:8}}>RICH CITY <span style={{color:'#60a5fa'}}>LEAGUE</span></div>
            <div style={{fontSize:16,letterSpacing:6,color:'#94a3b8',marginTop:8}}>RICHMOND • VIRGINIA</div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',maxWidth:900}}>
          <div style={{fontSize:78,fontWeight:900,lineHeight:.92,letterSpacing:-3}}>MORE THAN<br/><span style={{color:'#f59e0b'}}>A LEAGUE.</span></div>
          <div style={{fontSize:26,color:'#cbd5e1',marginTop:28}}>Hoops • Community • Culture • Beyond</div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div style={{fontSize:18,color:'#94a3b8',letterSpacing:3}}>PLAYERS • COACHES • FANS • COMMUNITY</div>
          <div style={{fontSize:22,fontWeight:800,color:'#f59e0b'}}>richcityhoops.com</div>
        </div>
      </div>
    </div>,
    size,
  );
}
