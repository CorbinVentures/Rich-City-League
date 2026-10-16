import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCircleUser, FaComments, FaPeopleGroup } from 'react-icons/fa6';
import { getPublicClient } from '@/lib/public-data';

export const metadata: Metadata = {
  title: 'Virginia Basketball Community | RCH Pulse',
  description: 'Explore public conversations from Virginia basketball players, creators and fans. Free to browse Rich City Hoops.',
  alternates: { canonical: '/pulse' },
};

export const revalidate = 60;

type PublicPost = {
  id: string;
  body: string | null;
  created_at: string | null;
  author: {
    display_name?: string | null;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | Array<{
    display_name?: string | null;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }> | null;
};

export default async function PulsePublicPage() {
  // This is intentionally an anonymous, published-only view. The Supabase
  // profile/post RLS policies exclude private users, wall posts and blocks;
  // never use a privileged or service-role client to render this page.
  const publicDb = getPublicClient();
  const { data, error } = publicDb
    ? await (publicDb as any).from('posts')
        .select('id,body,created_at,author:profiles(display_name,username,first_name,last_name)')
        .eq('status', 'published')
        .is('target_profile_id', null)
        .order('created_at', { ascending: false })
        .limit(24)
    : { data: [], error: null };
  if (error) console.error('Unable to load the public RCH Pulse preview:', error.message);
  const posts = (data ?? []) as PublicPost[];

  return <main className="rch-browser-pulse">
    <section className="rch-browser-pulse-hero">
      <div className="rch-browser-pulse-inner">
        <span>RCH PULSE · VIRGINIA BASKETBALL</span>
        <h1>THE COMMUNITY.<br/><em>THE CULTURE.</em></h1>
        <p>The conversations and people behind Virginia basketball. Browse what&apos;s public, discover your next connection, and join free when you&apos;re ready to participate.</p>
        <div className="rch-browser-pulse-actions">
          <Link href="/auth/sign-up">Join the Community <FaArrowRight/></Link>
          <Link href="/discover">Find Basketball <FaBasketball/></Link>
        </div>
      </div>
    </section>
    <div className="rch-browser-pulse-inner rch-browser-pulse-body">
      <div className="rch-browser-pulse-heading">
        <div><span>PUBLIC COMMUNITY FEED</span><h2>WHAT HOOPERS ARE SAYING</h2></div>
        <Link href="/auth/sign-in?next=%2Fsocial">Sign in to post <FaArrowRight/></Link>
      </div>
      {posts.length ? <div className="rch-browser-pulse-grid">
        {posts.map(post => {
          const author = Array.isArray(post.author) ? post.author[0] : post.author;
          const name = author?.display_name || [author?.first_name,author?.last_name].filter(Boolean).join(' ') || 'RCH Member';
          return <article key={post.id} className="rch-browser-pulse-post">
            <div className="rch-browser-pulse-author"><span><FaCircleUser/></span><div><strong>{name}</strong><small>{post.created_at ? new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'America/New_York'}).format(new Date(post.created_at)) : 'RCH Community'}</small></div></div>
            <p>{post.body || 'Shared with the RCH basketball community.'}</p>
            <Link href="/auth/sign-up"><FaComments/> Join to react or comment <FaArrowRight/></Link>
          </article>;
        })}
      </div> : <div className="rch-browser-pulse-empty"><FaPeopleGroup/><h3>THE CONVERSATION IS JUST GETTING STARTED.</h3><p>Public community conversations will appear here as members publish them.</p><Link href="/auth/sign-up">Become part of RCH <FaArrowRight/></Link></div>}
    </div>
  </main>;
}
