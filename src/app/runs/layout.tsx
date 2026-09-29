import type { ReactNode } from 'react';
import { RunRoomLauncher } from '@/components/RunRoomLauncher';

export default function RunsLayout({children}:{children:ReactNode}){
  return <>{children}<RunRoomLauncher/></>;
}
