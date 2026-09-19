import Link from 'next/link';
import { Container } from '@/components/Container';

const items=[['Account','Profile, identity and participation settings','/profile'],['Security','Password and account security','/account/security'],['Notifications','Manage your RCL notifications','/notifications'],['Messages','Open your RCL conversations','/messages'],['Privacy','Review your account experience','/profile']];

export default function SettingsPage(){
 return <main className="rcl-platform-page rcl-settings-page min-h-screen pb-24 text-white"><Container maxWidth="xl" className="rcl-page-content"><p className="rcl-page-kicker">RCL CONTROL</p><h1 className="rcl-platform-title">SETTINGS</h1><p className="rcl-platform-lead">Customize your RCL experience.</p><section className="rcl-settings-list">{items.map(([title,body,href])=><Link href={href} className="rcl-settings-row" key={title}><span><b>{title}</b><small>{body}</small></span><strong>→</strong></Link>)}</section></Container></main>;
}