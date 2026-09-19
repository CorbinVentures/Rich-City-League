'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGauge, FaLayerGroup, FaScrewdriverWrench, FaPlug, FaShirt, FaShieldHalved } from 'react-icons/fa6';

const items=[
 {label:'Command Center',href:'/admin',icon:FaGauge},
 {label:'League Setup',href:'/admin/league-setup',icon:FaLayerGroup},
 {label:'Operations',href:'/admin/operations',icon:FaScrewdriverWrench},
 {label:'LeagueApps',href:'/admin/leagueapps',icon:FaPlug},
 {label:'Shop',href:'/admin/shop',icon:FaShirt},
 {label:'Control Center',href:'/admin/control-center',icon:FaShieldHalved},
];
export function AdminWorkspace(){
 const pathname=usePathname();
 return <section className="rcl-admin-workspace" aria-label="RCL administration">
   <div className="rcl-admin-workspace-head"><div><span>RCL ADMIN</span><b>COMMAND DECK</b></div><small>RESTRICTED · 804</small></div>
   <nav>{items.map(({label,href,icon:Icon})=><Link key={href} href={href} className={pathname===href?'active':''}><Icon/><span>{label}</span></Link>)}</nav>
 </section>;
}