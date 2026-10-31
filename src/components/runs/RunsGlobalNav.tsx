'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {FaBasketball,FaCompass,FaCrown,FaPeopleGroup} from 'react-icons/fa6';

const sections=[
 {id:'play',label:'Play',href:'/runs?view=world&mode=home',icon:FaBasketball},
 {id:'map',label:'World',href:'/runs/world',icon:FaCompass},
 {id:'crew',label:'Crews',href:'/crews?intent=mine',icon:FaPeopleGroup},
 {id:'player',label:'MyPLAYER',href:'/runs?view=world&mode=player',icon:FaCrown}
] as const;

/** Deep Runs pages share the same five destinations. The main World owns its dock. */
export function RunsGlobalNav(){
 const path=usePathname();
 if(!path||path==='/runs'||path==='/runs/world'||!path.startsWith('/runs/'))return null;
 const active=path.startsWith('/runs/courts/')?'map':'play';
 return <nav className="runs-global-nav" aria-label="Runs World primary navigation">
  {sections.map(item=><Link key={item.id} href={item.href} aria-current={active===item.id?'page':undefined}>
   <item.icon aria-hidden="true"/><span>{item.label}</span>
  </Link>)}
 </nav>;
}
