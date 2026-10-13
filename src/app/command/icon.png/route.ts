import { ImageResponse } from 'next/og';
import { createElement } from 'react';
export const runtime='edge';
export function GET(){return new ImageResponse(createElement('div',{style:{width:'100%',height:'100%',background:'#f52235',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:108,color:'white',fontSize:370,fontWeight:900,fontFamily:'Arial',letterSpacing:-25,paddingRight:32}},'R'),{width:512,height:512});}
