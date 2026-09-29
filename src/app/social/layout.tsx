import type { Metadata } from 'next';
import { SocialMediaShortcutBridge } from '@/components/social/SocialMediaShortcutBridge';

export const metadata: Metadata = {
  title: "RCL Social",
  description: "Connect with Richmond basketball players, coaches, and fans.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><SocialMediaShortcutBridge />{children}</>;
}
