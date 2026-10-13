import { ImageResponse } from 'next/og';
export const runtime='edge';
export function GET(){return new ImageResponse(<div style={{width:'100%',height:'100%',background:'#f52235',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:40,color:'white',fontSize:132,fontWeight:900,fontFamily:'Arial',letterSpacing:-8,paddingRight:10}}>R</div>,{width:180,height:180});}
