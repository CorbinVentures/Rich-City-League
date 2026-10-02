import { ImageResponse } from 'next/og';

export const size={width:512,height:512};
export const contentType='image/png';

export default function Icon(){
  return new ImageResponse(
    <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',background:'#F3F6F9',color:'#162331'}}>
      <div style={{position:'absolute',inset:24,borderRadius:116,border:'3px solid #D3DDE7',background:'#FFFFFF',boxShadow:'0 24px 70px rgba(35,55,72,.10)'}}/>
      <div style={{position:'absolute',width:360,height:360,borderRadius:999,border:'18px solid rgba(47,111,175,.10)'}}/>
      <div style={{position:'absolute',width:340,height:2,background:'rgba(47,111,175,.18)',transform:'rotate(-18deg)'}}/>
      <div style={{position:'absolute',width:340,height:2,background:'rgba(47,111,175,.14)',transform:'rotate(58deg)'}}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
        <div style={{fontSize:118,lineHeight:1,fontWeight:950,letterSpacing:-10,color:'#162331'}}>RCL</div>
        <div style={{width:176,height:5,borderRadius:99,marginTop:13,background:'#2F6FAF'}}/>
        <div style={{marginTop:18,fontSize:18,fontWeight:850,letterSpacing:6,color:'#526273'}}>BASKETBALL</div>
      </div>
      <div style={{position:'absolute',bottom:50,display:'flex',fontSize:14,fontWeight:800,letterSpacing:5,color:'#657688'}}>RICHMOND · 804</div>
    </div>,
    size,
  );
}
