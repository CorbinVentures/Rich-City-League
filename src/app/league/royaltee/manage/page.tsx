import type { Metadata } from 'next';
import { RoyalteeManager } from '@/components/RoyalteeManager';
export const metadata:Metadata={title:'Royaltee Organization HQ | Rich City League',robots:{index:false,follow:false}};
export default function RoyalteeManagePage(){return <RoyalteeManager/>;}
