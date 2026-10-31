import Link from 'next/link';
import { Container } from '@/components/Container';
import { FaArrowRight, FaBell, FaEnvelope, FaFileShield, FaLocationDot, FaLock, FaShieldHalved, FaUser } from 'react-icons/fa6';

const items = [
  {title:'Profile',href:'/profile',icon:FaUser},
  {title:'Security',href:'/account/security',icon:FaLock},
  {title:'Notifications',href:'/notifications',icon:FaBell},
  {title:'My area',href:'/settings/discovery',icon:FaLocationDot},
  {title:'Messages',href:'/messages',icon:FaEnvelope},
  {title:'Privacy',href:'/settings/privacy',icon:FaShieldHalved},
  {title:'Legal & safety',href:'/legal',icon:FaFileShield},
] as const;

export default function SettingsPage() {
  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <Container maxWidth="md" className="py-6 sm:py-9">
      <h1 className="font-display text-3xl font-black uppercase">Settings</h1>
      <nav aria-label="Account settings" className="mt-5 overflow-hidden rounded-xl border border-white/15">
        {items.map(({title,href,icon:Icon},index)=><Link key={href} href={href}
          className={`flex min-h-14 items-center gap-4 bg-white/[.025] px-4 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 ${index ? 'border-t border-white/10' : ''}`}>
          <Icon className="text-rcl-orange" aria-hidden="true"/>
          <span className="flex-1 font-semibold">{title}</span><FaArrowRight className="text-white/45" aria-hidden="true"/>
        </Link>)}
      </nav>
    </Container>
  </main>;
}
