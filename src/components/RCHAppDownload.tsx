'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isMobileStandaloneExperience } from '@/lib/rch-mobile-experience';
import {
  FaArrowRight, FaArrowUpFromBracket, FaBasketball, FaCheck,
  FaCircleInfo, FaDownload, FaMobileScreenButton, FaShieldHalved,
} from 'react-icons/fa6';

type Device = 'iphone' | 'android' | 'other';
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function detectDevice(): Device {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

function isInstalled() {
  const withStandalone = navigator as Navigator & { standalone?: boolean };
  return isMobileStandaloneExperience({
    standalone: window.matchMedia('(display-mode: standalone)').matches || withStandalone.standalone === true,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

export function RCHAppDownload({ apkUrl }: { apkUrl: string | null }) {
  const [device, setDevice] = useState<Device>('other');
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setDevice(detectDevice());
    setInstalled(isInstalled());
    setPrompt((window as Window & { __rchInstallPrompt?: InstallEvent }).__rchInstallPrompt ?? null);
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const complete = () => {
      // Installing does not turn the current browser tab into a standalone app.
      setInstalled(isInstalled());
      setPrompt(null);
      delete (window as Window & { __rchInstallPrompt?: InstallEvent }).__rchInstallPrompt;
      setStatus('RCH was added to your apps. Open it from your Home Screen to access the full platform.');
    };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  async function installPWA() {
    if (!prompt) {
      setHelp(true);
      setStatus('Use your Android browser menu and select Install app or Add to Home screen.');
      return;
    }
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      setPrompt(null);
      delete (window as Window & { __rchInstallPrompt?: InstallEvent }).__rchInstallPrompt;
      if (result.outcome === 'accepted') setStatus('Follow your browser confirmation to finish installing RCH.');
      else setStatus('Installation cancelled. You can try again from the browser menu.');
    } catch {
      setHelp(true);
      setStatus('Open your browser menu, then select Install app.');
    }
  }

  function showIOSInstructions() {
    setHelp(true);
    setStatus('On iPhone, Apple requires you to confirm Add to Home Screen yourself.');
    document.getElementById('rch-app-instructions')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const chooseDevice = (selection: Device) => {
    setDevice(selection);
    setHelp(false);
    setStatus('');
  };

  return (
    <main className="rch-download-page">
      <section className="rch-download-hero" aria-labelledby="rch-download-title">
        <div className="rch-download-hero-inner">
          <div className="rch-download-copy">
            <div className="rch-download-identity" aria-label="Rich City Hoops">
              <span className="rch-download-identity-symbol">R</span>
              <div><strong>RICH CITY <span>HOOPS</span></strong><small>THE CITY. THE GAME. THE COMMUNITY.</small></div>
            </div>
            <span className="rch-download-eyebrow">RCH · MADE FOR THE CITY. BUILT FOR YOUR PHONE.</span>
            <h1 id="rch-download-title">Richmond hoops. <em>One home.</em></h1>
            <p className="rch-download-intro">The local basketball scene finally has a home. Connect with players, find open runs, share highlights, earn REP, and follow Rich City League—all through the RCH mobile app.</p>
            <div className="rch-download-benefits">
              <span><FaCheck aria-hidden="true" /> Free to join</span>
              <span><FaCheck aria-hidden="true" /> Real mobile app experience</span>
              <span><FaCheck aria-hidden="true" /> Your city, your basketball identity</span>
            </div>
            <div className="rch-download-main-action">
              {installed ? (
                <Link href="/social" className="rch-download-button rch-download-primary">Open RCH <FaArrowRight aria-hidden="true"/></Link>
              ) : device === 'iphone' ? (
                <button type="button" className="rch-download-button rch-download-primary" onClick={showIOSInstructions}>
                  <FaMobileScreenButton aria-hidden="true"/> Set up RCH on iPhone
                </button>
              ) : device === 'android' && apkUrl ? (
                <a href={apkUrl} className="rch-download-button rch-download-primary" rel="noopener noreferrer">
                  <FaDownload aria-hidden="true"/> Download Android APK
                </a>
              ) : device === 'android' ? (
                <button type="button" className="rch-download-button rch-download-primary" onClick={() => void installPWA()}>
                  <FaDownload aria-hidden="true"/> Install RCH on Android
                </button>
              ) : (
                <a href="#rch-app-instructions" className="rch-download-button rch-download-primary">
                  <FaMobileScreenButton aria-hidden="true"/> Choose your phone
                </a>
              )}
              <span className="rch-download-action-note">
                {installed ? 'You are already using the mobile app.' : device === 'iphone'
                  ? 'Use Safari’s Add to Home Screen option to unlock the full experience.'
                  : device === 'android' && apkUrl
                  ? 'Android may ask you to approve installation from this source.'
                  : device === 'other'
                  ? 'Open this page on an iPhone or Android phone to install.'
                  : 'Install from Chrome to use the full RCH experience.'}
              </span>
            </div>
            <div className="rch-download-account-links">
              <Link href="/auth/sign-up">Create your free profile <FaArrowRight aria-hidden="true" /></Link>
              <Link href="/auth/sign-in">Already a member? Sign in</Link>
            </div>
            <p className="rch-download-browser-note">Browser access is for registration and profile setup. The basketball platform opens in the installed mobile app.</p>
          </div>
          <div className="rch-download-device-art" aria-hidden="true">
            <div className="rch-download-device-top"><b>RCH</b><span>RICHMOND, VA · 804</span></div>
            <div className="rch-download-logo"><Image src="/icon?v=black-r-1" alt="" width={100} height={100} unoptimized /></div>
            <strong>YOUR CITY. YOUR COURT.</strong>
            <span>ONE BASKETBALL WORLD.</span>
            <div className="rch-download-preview-list">
              <div><FaBasketball /><span><b>OPEN RUNS</b><small>Find your next game</small></span><FaArrowRight /></div>
              <div><FaMobileScreenButton /><span><b>THE COMMUNITY</b><small>Post. Message. Connect.</small></span><FaArrowRight /></div>
              <div><FaCheck /><span><b>REP + BADGES</b><small>Build your name in the city</small></span><FaArrowRight /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="rch-download-content" id="rch-app-instructions" aria-label="Choose a download method">
        <div className="rch-download-content-heading">
          <span className="rch-download-kicker">YOUR PASS TO THE CITY</span>
          <h2>Get RCH on your phone</h2>
          <p>A mobile install unlocks the full RCH experience. Choose your phone below and follow the quick steps.</p>
        </div>
        <div className="rch-download-choice" role="group" aria-label="Select device">
          <button type="button" className={device === 'iphone' ? 'selected' : ''} aria-pressed={device === 'iphone'} onClick={() => chooseDevice('iphone')}>iPhone / iPad</button>
          <button type="button" className={device === 'android' ? 'selected' : ''} aria-pressed={device === 'android'} onClick={() => chooseDevice('android')}>Android</button>
        </div>

        <article className="rch-download-guide">
          {device === 'iphone' ? (
            <>
              <div className="rch-download-guide-heading"><FaMobileScreenButton aria-hidden="true"/><div><span>iPhone & iPad</span><h3>Install RCH as a web app</h3></div></div>
              <p>iOS does not allow a website to install an app automatically. The steps below add the real full-screen RCH web app, not a normal Safari bookmark.</p>
              <ol className="rch-download-steps">
                <li><b>1</b><span>Open <strong>richcityhoops.com/app</strong> in Safari.</span></li>
                <li><b>2</b><span>Tap the Page Menu or Share button <FaArrowUpFromBracket aria-label="Share"/> and choose <strong>Add to Home Screen</strong>.</span></li>
                <li><b>3</b><span>Leave <strong>Open as Web App</strong> turned on, then tap <strong>Add</strong>.</span></li>
                <li><b>4</b><span>Open the RCH icon from your Home Screen to launch the standalone app.</span></li>
              </ol>
              <button type="button" className="rch-download-button rch-download-secondary" onClick={showIOSInstructions}>
                <FaCircleInfo aria-hidden="true"/> {help ? 'Follow the steps above' : 'Show me how to install'}
              </button>
            </>
          ) : device === 'android' ? (
            <>
              <div className="rch-download-guide-heading"><FaDownload aria-hidden="true"/><div><span>Android</span><h3>{apkUrl ? 'Download the RCH APK' : 'Install RCH today'}</h3></div></div>
              {apkUrl ? (
                <>
                  <p>Download the signed Android package from our official app link. Your phone may ask you to approve installing an app from your browser.</p>
                  <a href={apkUrl} rel="noopener noreferrer" className="rch-download-button rch-download-secondary"><FaDownload aria-hidden="true"/> Download signed APK</a>
                  <p className="rch-download-footnote">Only install APKs distributed through RCH&apos;s official site. Android may show a sideloading warning.</p>
                </>
              ) : (
                <>
                  <p>The standalone RCH web app is available now. A direct APK download will appear here after the signed Android package is published and verified.</p>
                  <button type="button" onClick={() => void installPWA()} className="rch-download-button rch-download-secondary">
                    <FaMobileScreenButton aria-hidden="true"/> Install web app now
                  </button>
                  {help && <p className="rch-download-footnote">In Chrome on Android, open the browser menu (⋮), choose <strong>Install app</strong>, and confirm. If that option is missing, try Add to Home screen.</p>}
                </>
              )}
            </>
          ) : (
            <>
              <div className="rch-download-guide-heading"><FaMobileScreenButton aria-hidden="true"/><div><span>iOS & Android</span><h3>Open this page on your phone</h3></div></div>
              <p>Use the buttons above to view the iPhone or Android installation instructions.</p>
            </>
          )}
          {status && <p className="rch-download-status" role="status">{status}</p>}
        </article>
        <div className="rch-download-trust">
          <FaShieldHalved aria-hidden="true"/>
          <p><b>Official Rich City Hoops installation page.</b> Avoid third-party app download sites and unknown configuration profiles. Your account and basketball community stay at richcityhoops.com.</p>
        </div>
        <p className="rch-download-return"><Link href="/auth/sign-up">Create your free RCH profile <FaArrowRight aria-hidden="true"/></Link> <Link href="/auth/sign-in">Sign in</Link></p>
        <footer className="rch-download-legal" aria-label="Rich City Hoops legal information">
          <span>© {new Date().getFullYear()} Rich City Hoops · Richmond, VA</span>
          <nav aria-label="Legal"><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/community-guidelines">Guidelines</Link></nav>
        </footer>
      </section>
    </main>
  );
}
