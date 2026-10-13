import type { Metadata } from 'next';
export const metadata: Metadata = { title:'RCL Command Center',description:'Private Rich City League operations.',manifest:'/command/manifest.webmanifest',icons:{icon:'/command/icon.svg',apple:'/command/icon.svg'},appleWebApp:{capable:true,title:'RCL Command',statusBarStyle:'black-translucent'},robots:{index:false,follow:false}};
export default function CommandLayout({children}:{children:React.ReactNode}) {return children;}
