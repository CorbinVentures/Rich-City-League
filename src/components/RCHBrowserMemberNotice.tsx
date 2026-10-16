'use client';

import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCompass, FaLock, FaTrophy, FaUsers } from 'react-icons/fa6';

/** Safe, public-web-native landing for routes that require a member session.
 * Never mounts the installed app, protected data queries or workspace chrome. */
export function RCHBrowserMemberNotice({ pathname }: {pathname: string}) {
  const feature = pathname.startsWith('/messages') ? 'Messages'
    : pathname.startsWith('/social') ? 'Social'
    : pathname.startsWith('/settings') ? 'Account settings'
    : pathname.startsWith('/my-hoops') ? 'My Hoops'
    : pathname.startsWith('/fantasy') ? 'Fantasy'
    : pathname.startsWith('/dashboard') ? 'Member dashboard'
    : pathname.startsWith('/notifications') ? 'Notifications'
    : pathname.startsWith('/professional') ? 'Professional dashboard'
    : 'Member workspace';

  return <main className="rch-browser-member-notice">
    <div className="rch-browser-member-notice-inner">
      <div className="rch-browser-member-notice-content">
        <span className="rch-browser-member-kicker"><FaLock aria-hidden="true"/> PERSONAL ACCOUNT FEATURE</span>
        <h1>YOUR BASKETBALL.<br/><em>YOUR WAY.</em></h1>
        <h2>{feature}</h2>
        <p>This area uses your personal account. You can keep exploring Virginia basketball on the public site without signing in or installing anything.</p>
        <div className="rch-browser-member-actions">
          <Link className="rch-browser-member-primary" href="/auth/sign-in">Sign in <FaArrowRight/></Link>
          <Link className="rch-browser-member-outline" href="/discover">Explore basketball <FaCompass/></Link>
        </div>
        <span className="rch-browser-member-note">The full installed RCH app remains available whenever you&apos;re ready.</span>
      </div>
      <nav className="rch-browser-member-discover" aria-label="Continue exploring publicly">
        <Link href="/runs"><FaBasketball/><span><b>Find Runs</b><small>Discover your next game</small></span><FaArrowRight/></Link>
        <Link href="/league"><FaTrophy/><span><b>Rich City League</b><small>Teams and competition</small></span><FaArrowRight/></Link>
        <Link href="/pulse"><FaUsers/><span><b>RCH Social</b><small>Read the public community feed</small></span><FaArrowRight/></Link>
        <Link href="/app"><FaCompass/><span><b>Get RCH App</b><small>Bring basketball to your home screen</small></span><FaArrowRight/></Link>
      </nav>
    </div>
  </main>;
}
