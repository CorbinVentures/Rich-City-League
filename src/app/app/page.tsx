import type { Metadata } from 'next';
import { RCHAppDownload } from '@/components/RCHAppDownload';

export const metadata: Metadata = {
  title: { absolute: 'Get the RCH App | Rich City Hoops' },
  description: 'Get Rich City Hoops on your phone. Follow Virginia basketball, discover runs, share highlights and stay connected.',
  alternates: { canonical: '/app' },
  openGraph: {
    title: 'Get the RCH App | Rich City Hoops',
    description: 'Your basketball world, one tap away.',
    url: '/app',
  },
};

export const dynamic = 'force-dynamic';

type GitHubRelease = {
  tag_name?: string;
  assets?: Array<{ name: string; state?: string; browser_download_url?: string }>;
};

// Show an actual download only after our CI has published a signed GitHub release.
// The GitHub release asset is verified by its exact filename and repository path.
// Cache GitHub API requests, never delay the entire site when GitHub is unavailable.
async function officialApkUrl(): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/repos/CorbinVentures/Rich-City-League/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3500),
    });
    if (response.ok) {
      const release = await response.json() as GitHubRelease;
      if (release.tag_name?.startsWith('android-v')) {
        const asset = release.assets?.find(item => item.name === 'RCH-Android.apk' && item.state === 'uploaded');
        if (asset?.browser_download_url) {
          const url = new URL(asset.browser_download_url);
          if (url.protocol === 'https:' && url.hostname === 'github.com'
            && url.pathname.startsWith('/CorbinVentures/Rich-City-League/releases/download/')
            && url.pathname.endsWith('/RCH-Android.apk')) return url.toString();
        }
      }
    }
  } catch {
    // Keep the working Android PWA fallback when GitHub is unavailable.
  }
  const manualUrl = process.env.RCH_ANDROID_APK_URL?.trim();
  if (!manualUrl) return null;
  try {
    const url = new URL(manualUrl);
    return url.protocol === 'https:' && url.pathname.toLowerCase().endsWith('.apk') ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function AppDownloadPage() {
  return <RCHAppDownload apkUrl={await officialApkUrl()} />;
}
