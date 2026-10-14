import Link from 'next/link';
import {FaArrowRight,FaCompass} from 'react-icons/fa6';
import {nextRCHStep} from '@/lib/rch-user-intents';

export function RCHContinueJourney({pathname}:{pathname:string}){
 const step=nextRCHStep(pathname);
 if(!step)return null;
 return <section className="rch-next-journey" aria-label="What to do next on RCH">
  <div className="rch-next-journey-copy"><p><FaCompass aria-hidden="true"/> WHERE NEXT?</p><h2>{step.heading}</h2><span>{step.detail}</span></div>
  <div className="rch-next-journey-links">
   {step.links.map(link=><Link href={link.href} key={link.href}>{link.label}<FaArrowRight aria-hidden="true"/></Link>)}
  </div>
 </section>;
}
