export type LogoShape = 'shield'|'circle'|'burst'|'hex'|'none';
export type LogoSymbol = 'basketball'|'crown'|'star'|'bolt'|'flame'|'wings';
export type CrewLogoDesign = {
  name: string; tagline: string; shape:LogoShape; symbol:LogoSymbol;
  primary:string; secondary:string; ink:string;
  symbolSize:number; symbolY:number; nameSize:number; nameY:number;
  showSymbol:boolean; showTagline:boolean;
};
export const logoPresets: {name:string;shape:LogoShape;symbol:LogoSymbol;primary:string;secondary:string;ink:string}[]=[
  {name:'Street',shape:'burst',symbol:'bolt',primary:'#0eeadf',secondary:'#142d55',ink:'#ffffff'},
  {name:'Championship',shape:'shield',symbol:'crown',primary:'#efc46b',secondary:'#111e3a',ink:'#ffffff'},
  {name:'City Elite',shape:'circle',symbol:'basketball',primary:'#4d9cff',secondary:'#12223e',ink:'#ffffff'},
  {name:'Fire',shape:'hex',symbol:'flame',primary:'#fc6642',secondary:'#311827',ink:'#ffffff'},
  {name:'Minimal',shape:'none',symbol:'star',primary:'#ffffff',secondary:'#161f31',ink:'#10e1cc'},
  {name:'Wings',shape:'shield',symbol:'wings',primary:'#a58aff',secondary:'#141b36',ink:'#ffffff'}
];
export const initialLogoDesign=(name='MY CREW'):CrewLogoDesign=>({
 name,tagline:'EST. RCH',shape:'shield',symbol:'basketball',
 primary:'#2dd4ef',secondary:'#122a45',ink:'#ffffff',
 symbolSize:1,symbolY:203,nameSize:48,nameY:360,showSymbol:true,showTagline:true
});
const escapeXml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]||''));
const hex=(v:string,fallback:string)=>/^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
const clamp=(value:number,min:number,max:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):min;
const symbolDraw:Record<LogoSymbol,string>={
 basketball:'<circle cx="0" cy="0" r="72" fill="none" stroke="currentColor" stroke-width="13"/><path d="M-70 0H70 M0-70V70 M-50-50C15-20 15 20-50 50 M50-50C-15-20-15 20 50 50" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>',
 crown:'<path d="M-84 54 -95-48 -41-18 0-79 42-18 95-48 84 54Z" fill="currentColor" opacity=".92"/><path d="M-77 40H77 M-64 57H64" stroke="#101b30" stroke-width="9" stroke-linecap="round"/>',
 star:'<path d="M0-95 25-29 96-29 40 18 59 89 0 47 -59 89 -40 18 -96-29 -25-29Z" fill="currentColor"/>',
 bolt:'<path d="M5-105 -85 18 -20 18 -45 102 88-31 20-31 51-105Z" fill="currentColor"/>',
 flame:'<path d="M-64 74Q-97 25-44-46Q-38-8-12-22Q12-40 12-99Q87-31 80 34Q76 84 25 92Q47 57 12 23Q2 60-31 71Q-37 52-24 28Q-73 42-64 74Z" fill="currentColor"/>',
 wings:'<path d="M-7-22C-54-78-111-61-128-81L-97-29 -129-35 -84 6 -114 17 -56 32 -74 53 0 70 74 53 56 32 114 17 84 6 129-35 97-29 128-81C111-61 54-78 7-22L0 1Z" fill="currentColor"/>'
};
export function createCrewLogoSvg(raw:CrewLogoDesign){
 const d={...raw,name:raw.name.slice(0,36).toUpperCase(),tagline:raw.tagline.slice(0,60).toUpperCase()};
 const pri=hex(d.primary,'#2dd4ef'),sec=hex(d.secondary,'#122a45'),ink=hex(d.ink,'#ffffff');
 const shapes:Record<LogoShape,string>={
  shield:'M256 36 443 106 428 332 256 478 84 332 69 106Z',
  circle:'M256 49A207 207 0 1 1 255.99 49Z',
  burst:'M256 21 301 78 376 48 390 126 471 139 441 217 498 273 434 316 448 404 355 411 308 484 256 438 197 486 156 411 60 403 83 319 15 266 86 220 48 139 133 124 146 47 208 78Z',
  hex:'M256 24 456 139 456 367 256 488 56 367 56 139Z',none:''
 };
 const outline=d.shape==='none'?'':`<path d="${shapes[d.shape]}" fill="url(#bg)" stroke="${pri}" stroke-width="12" stroke-linejoin="round"/><path d="${shapes[d.shape]}" fill="none" stroke="${ink}" stroke-opacity=".28" stroke-width="3" transform="translate(256 256) scale(.90) translate(-256 -256)"/>`;
 const icon=d.showSymbol?`<g transform="translate(256 ${clamp(d.symbolY,140,285)}) scale(${clamp(d.symbolSize,.5,1.6)})" color="${pri}">${symbolDraw[d.symbol]}</g>`:'';
 const label=escapeXml(d.name||'MY CREW');const letters=label.length>21?26:label.length>15?34:clamp(d.nameSize,26,64);
 const title=`<text x="256" y="${clamp(d.nameY,290,415)}" text-anchor="middle" font-family="Impact,Arial Black,Arial,sans-serif" font-size="${letters}" font-weight="900" letter-spacing=".6" fill="${ink}" stroke="${sec}" stroke-width="9" paint-order="stroke fill">${label}</text>`;
 const caption=d.showTagline?`<text x="256" y="${Math.min(460,clamp(d.nameY,290,415)+40)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="900" letter-spacing="3" fill="${pri}">${escapeXml(d.tagline)}</text>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs><linearGradient id="bg" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="${sec}"/><stop offset="1" stop-color="#050c18"/></linearGradient></defs>${outline}${icon}${title}${caption}</svg>`;
}
