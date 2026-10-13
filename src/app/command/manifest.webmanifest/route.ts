import { NextResponse } from 'next/server';
export const dynamic = 'force-static';
export function GET() {
 const manifest = { id:'/command',name:'RCL Command Center',short_name:'RCL Command',description:'Private basketball league operations for Rich City League.',start_url:'/command',scope:'/command',display:'standalone',background_color:'#090b10',theme_color:'#f52235',orientation:'any',categories:['sports','business','productivity'],icons:[{src:'/command/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},{src:'/command/icon.png',sizes:'512x512',type:'image/png',purpose:'maskable'},{src:'/command/apple-icon.png',sizes:'180x180',type:'image/png',purpose:'any'}] };
 return new NextResponse(JSON.stringify(manifest),{headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'public, max-age=3600'}});
}
