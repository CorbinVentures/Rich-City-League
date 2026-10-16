'use client';

import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCompass, FaLock, FaTrophy, FaUsers } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';

/** Safe, public-web-native landing for routes that require a member session.
 * Never mounts the installed app, protected data queries or workspace chrome. */
export function RCHBrowserMemberNotice({ pathname }: {pathname: string}) {
  const { user, loading } = useAuth();
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
        <p>{loading ? 'Checking your account…' : user
          ? 'You are signed in to Rich City Hoops. Your private member workspace uses the installed RCH app; the public website stays available here without switching to the PWA layout.'
          : 'This page belongs to your RCH account. Sign in once to access available member tools directly on the website, or explore public basketball without an account.'}</p>
        <div className="rch-browser-member-actions">
          <Link className="rch-browser-member-primary" href={user ? '/discover' : `/auth/sign-in?next=${encodeURIComponent(pathname)}`}>{user ? <>Explore basketball <FaCompass/></> : <>Sign in to continue <FaArrowRight/></>}</Link>
          <Link className="rch-browser-member-outline" href="/app">Get the RCH App <FaArrowRight/></Link>
        </div>
        <span className="rch-browser-member-note">{user
          ? <>Signed in as {user.email ?? 'an RCH member'}. <Link href="/profile">View your profile</Link>, or open the RCH app to use member tools.</>
          : <>New to RCH? <Link href="/auth/sign-up">Create a free account</Link>. Already registered? You can use the same account in your browser and the installed app.</>}</span>
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
