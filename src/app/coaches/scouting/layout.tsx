import type { ReactNode } from 'react';
import { ScoutingAccessGate } from '@/components/ScoutingAccessGate';

export default function ScoutingLayout({ children }: { children: ReactNode }) {
  return <ScoutingAccessGate>{children}</ScoutingAccessGate>;
}
