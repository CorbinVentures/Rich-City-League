import { ImageResponse } from 'next/og';
import { createElement } from 'react';
export const runtime='edge';
export function GET(){return new ImageResponse(createElement('div',{style:{width:'100%',height:'100%',background:'#f52235',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:40,color:'white',fontSize:132,fontWeight:900,fontFamily:'Arial',letterSpacing:-8,paddingRight:10}},'R'),{width:180,height:180});}
