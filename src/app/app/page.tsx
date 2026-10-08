import type { Metadata } from 'next';
import { RCHAppDownload } from '@/components/RCHAppDownload';

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

function verifiedApkUrl() {
  const candidate = process.env.RCH_ANDROID_APK_URL?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    // Point to a published, signed APK on trusted HTTPS hosting only.
    if (url.protocol !== 'https:' || !url.pathname.toLowerCase().endsWith('.apk')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function AppDownloadPage() {
  return <RCHAppDownload apkUrl={verifiedApkUrl()} />;
}
