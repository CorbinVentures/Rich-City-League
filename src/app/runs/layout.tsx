import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RunRoomLauncher } from '@/components/RunRoomLauncher';
import { RunsGlobalNav } from '@/components/runs/RunsGlobalNav';
import './runs-global-nav.css';

export const metadata: Metadata = {
  title: { absolute: 'Pickup Basketball Runs in Virginia | Rich City Hoops' },
  description: 'Discover pickup basketball runs in Richmond and across Virginia. Play 1v1–5v5, find local courts, join crews, earn badges and compete on RCH Runs.',
  keywords: ['pickup basketball Virginia', 'Richmond basketball runs', '1v1 basketball Richmond', 'basketball courts Virginia', 'RCH Runs', 'Virginia basketball crews'],
};

export default function RunsLayout({children}:{children:ReactNode}){
  return <>{children}<RunsGlobalNav/><RunRoomLauncher/></>;
}
