import { ImageResponse } from 'next/og';

export const runtime='edge';
export const alt='RCL — Richmond basketball social';
export const size={width:1200,height:630};
export const contentType='image/png';

export default function Image(){
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',position:'relative',overflow:'hidden',background:'#F6F9FC',color:'#0F2547',fontFamily:'Arial, sans-serif'}}>
      <div style={{position:'absolute',inset:0,display:'flex',background:'radial-gradient(circle at 84% 22%, rgba(59,130,246,.14), transparent 30%), radial-gradient(circle at 18% 90%, rgba(100,116,139,.10), transparent 32%)'}}/>
      <div style={{position:'absolute',right:-70,top:-85,width:500,height:500,border:'22px solid rgba(59,130,246,.10)',borderRadius:500,display:'flex'}}/>
      <div style={{position:'absolute',right:90,top:90,width:270,height:270,border:'2px solid rgba(15,37,71,.08)',borderRadius:270,display:'flex'}}/>
      <div style={{position:'absolute',left:0,top:0,width:12,height:'100%',background:'#3B82F6',display:'flex'}}/>

      <div style={{padding:'64px 72px 56px 82px',display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',zIndex:2}}>
        <div style={{display:'flex',alignItems:'center',gap:18}}>
          <div style={{width:64,height:64,borderRadius:18,border:'2px solid #D9E4EF',background:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:25,fontWeight:900,color:'#3B82F6'}}>R</div>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:4,color:'#0F2547'}}>RCL · BASKETBALL SOCIAL</div>
            <div style={{marginTop:7,fontSize:17,color:'#64748B',letterSpacing:2}}>RICHMOND, VIRGINIA · 804</div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',maxWidth:900}}>
          <div style={{fontSize:78,lineHeight:.96,fontWeight:900,letterSpacing:-4,display:'flex',flexDirection:'column'}}>
            <span>YOUR BASKETBALL WORLD.</span>
            <span style={{color:'#3B82F6'}}>ALL IN ONE PLACE.</span>
          </div>
          <div style={{marginTop:24,fontSize:25,color:'#64748B',lineHeight:1.35}}>People · Runs · Highlights · Discovery · Rich City League</div>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:21,fontWeight:850,letterSpacing:2}}>RICHCITYHOOPS.COM</div>
          <div style={{padding:'13px 22px',borderRadius:999,background:'#0F2547',color:'#FFFFFF',fontSize:18,fontWeight:900,display:'flex'}}>JOIN THE WORLD</div>
        </div>
      </div>
    </div>,
    size,
  );
}
