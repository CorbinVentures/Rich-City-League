import type { Metadata, Viewport } from 'next';
import './command.css';
import './command-analytics-viz.css';
export const metadata: Metadata = { title:'RCL Command Center',description:'Private Rich City League operations.',manifest:'/command/manifest.webmanifest',icons:{icon:[{url:'/command/icon.svg',type:'image/svg+xml'},{url:'/command/icon.png',type:'image/png',sizes:'512x512'}],apple:[{url:'/command/apple-icon.png',sizes:'180x180',type:'image/png'}]},appleWebApp:{capable:true,title:'RCL Command',statusBarStyle:'black-translucent'},robots:{index:false,follow:false}};
export const viewport: Viewport = {themeColor:'#f52235',width:'device-width',initialScale:1,viewportFit:'cover'};
export default function CommandLayout({children}:{children:React.ReactNode}) {return children;}
