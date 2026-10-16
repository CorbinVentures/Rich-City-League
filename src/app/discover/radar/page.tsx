import Link from 'next/link';
import VirginiaWorld from '@/components/discover/VirginiaWorld';

export const metadata = {
  title: 'Court Radar | Virginia Basketball Map | Rich City Hoops',
  description: 'Explore real basketball courts, runs and published events on the interactive Virginia basketball map.',
  alternates: { canonical: '/discover/radar' },
};

export default function CourtRadarPage() {
  return <>
    <div style={{background:'#071b30',padding:'12px 18px',textAlign:'center'}}>
      <Link href="/discover" style={{color:'#dbeeff',fontSize:13,fontWeight:800}}>
        ← Back to The Scene · Opportunity Feed
      </Link>
    </div>
    <VirginiaWorld />
  </>;
}
