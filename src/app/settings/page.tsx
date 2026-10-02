import Link from 'next/link';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { FaArrowRight, FaBell, FaEnvelope, FaFileShield, FaLock, FaShieldHalved, FaUser } from 'react-icons/fa6';

const items = [
  { title:'Account', body:'Profile, identity and participation settings', href:'/profile', icon:FaUser },
  { title:'Security', body:'Password and account security', href:'/account/security', icon:FaLock },
  { title:'Notifications', body:'Review your RCL alerts and activity', href:'/notifications', icon:FaBell },
  { title:'Messages', body:'Open your RCL conversations', href:'/messages', icon:FaEnvelope },
  { title:'Privacy', body:'Privacy controls and data requests', href:'/settings/privacy', icon:FaShieldHalved },
  { title:'Legal & Safety', body:'Terms, privacy, copyright and community rules', href:'/legal', icon:FaFileShield },
];

export default function SettingsPage(){
  return <main className="rcl-social-world min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero eyebrow="RCL Control" title="Settings" accent="Your account, your rules" description="Manage your identity, security, notifications, privacy, and account tools from one clear control center." />
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(({title,body,href,icon:Icon}) => <Link href={href} className="group relative overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 transition hover:-translate-y-1 hover:border-rcl-blue/45" key={title}>
        <div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><Icon/></span><FaArrowRight className="mt-1 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/></div>
        <h2 className="mt-7 font-display text-2xl font-black uppercase group-hover:text-rcl-blue">{title}</h2><p className="mt-2 text-sm leading-6 text-white/40">{body}</p>
      </Link>)}</div>
    </Container>
  </main>;
}
