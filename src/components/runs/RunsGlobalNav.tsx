'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {FaBasketball,FaCompass,FaCrown,FaHouse,FaPeopleGroup} from 'react-icons/fa6';

const sections=[
 {id:'home',label:'Home',href:'/runs',icon:FaHouse},
 {id:'map',label:'Map',href:'/runs/world',icon:FaCompass},
 {id:'runs',label:'Runs',href:'/runs?view=list#rch-upcoming-runs',icon:FaBasketball},
 {id:'vault',label:'Vault',href:'/runs?mode=vault',icon:FaCrown},
 {id:'crew',label:'Crew',href:'/crews?intent=mine',icon:FaPeopleGroup}
] as const;

/** Deep Runs pages share the same five destinations. The main World owns its dock. */
export function RunsGlobalNav(){
 const path=usePathname();
 if(!path||path==='/runs'||path==='/runs/world'||!path.startsWith('/runs/'))return null;
 const active=path.startsWith('/runs/courts/')?'map':'runs';
 return <nav className="runs-global-nav" aria-label="Runs World primary navigation">
  {sections.map(item=><Link key={item.id} href={item.href} aria-current={active===item.id?'page':undefined}>
   <item.icon aria-hidden="true"/><span>{item.label}</span>
  </Link>)}
 </nav>;
}
