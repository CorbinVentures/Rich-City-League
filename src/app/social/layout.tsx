import type { Metadata } from 'next';
import { SocialMediaShortcutBridge } from '@/components/social/SocialMediaShortcutBridge';

export const metadata: Metadata = {
  title: "RCH Pulse | Rich City Hoops",
  description: "RCH Pulse brings Virginia basketball, creators, community conversations, local runs and stories together.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><SocialMediaShortcutBridge />{children}</>;
}
