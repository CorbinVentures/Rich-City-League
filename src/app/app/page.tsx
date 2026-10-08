import type { Metadata } from 'next';
import { RCHAppDownload } from '@/components/RCHAppDownload';
import { verifiedRCHApkUrl } from '@/lib/rch-mobile-experience';

export const metadata: Metadata = {
  title: { absolute: 'Get the RCH App | Rich City Hoops' },
  description: 'Get Rich City Hoops on your phone. Follow Richmond basketball, discover runs, share highlights and stay connected.',
  alternates: { canonical: '/app' },
  openGraph: {
    title: 'Get the RCH App | Rich City Hoops',
    description: 'Your basketball world, one tap away.',
    url: '/app',
  },
};

export default function AppDownloadPage() {
  return <RCHAppDownload apkUrl={verifiedRCHApkUrl(process.env.RCH_ANDROID_APK_URL)} />;
}
