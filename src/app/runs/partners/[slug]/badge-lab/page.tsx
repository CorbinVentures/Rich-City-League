import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import SybBadgeLab from '@/components/runs/SybBadgeLab';

export const metadata:Metadata={title:'SYB Badge Design Lab | RCH Runs',robots:{index:false,follow:false}};

export default async function SybBadgeLabPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug!=='syb-hoop-richmond')notFound();
 return <SybBadgeLab/>;
}
