import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
 return { id:'/command', name:'RCL Command Center',short_name:'RCL Command',description:'Private operations headquarters for Rich City League.',start_url:'/command',scope:'/command',display:'standalone',background_color:'#090b10',theme_color:'#f52235',categories:['sports','business','productivity'],icons:[{src:'/command/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},{src:'/command/icon.png',sizes:'512x512',type:'image/png',purpose:'maskable'},{src:'/command/apple-icon.png',sizes:'180x180',type:'image/png',purpose:'any'}] };
}
