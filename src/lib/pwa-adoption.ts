export type MobilePwaPlatform = 'ios' | 'android';

export type MobileLaunchSignal = {
  standalone: boolean;
  userAgent: string;
  navigatorPlatform?: string;
  maxTouchPoints?: number;
};

/**
 * A mobile standalone launch is stronger than an install-button click but
 * cannot certify that the app remains installed after its last observation.
 */
export function classifyMobilePwaLaunch(signal: MobileLaunchSignal): MobilePwaPlatform | null {
  if (!signal.standalone) return null;
  if (/Android/i.test(signal.userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(signal.userAgent)) return 'ios';
  if (signal.navigatorPlatform === 'MacIntel' && (signal.maxTouchPoints ?? 0) > 1) return 'ios';
  return null;
}

export type PwaAdoptionMember = {
  profileId: string;
  name: string;
  username: string | null;
  platforms: MobilePwaPlatform[];
  deviceCount: number;
  launches: number;
  firstSeen: string;
  lastSeen: string;
};