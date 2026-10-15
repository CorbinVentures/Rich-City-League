import type { Metadata } from 'next';
import { RoyalteeCoachDashboard } from '@/components/RoyalteeCoachDashboard';
export const metadata:Metadata={title:'Royaltee Cheerleading Dashboard | Rich City Hoops',robots:{index:false,follow:false}};
export default function RoyalteeCoachDashboardPage(){return <RoyalteeCoachDashboard/>;}
