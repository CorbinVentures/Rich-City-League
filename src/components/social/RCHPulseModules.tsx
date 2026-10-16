import Link from 'next/link';
import { FaArrowRight, FaBolt, FaCalendarDays, FaComments, FaPeopleGroup, FaPlay, FaPlus } from 'react-icons/fa6';
import type { NetworkPost } from '@/components/social/NetworkPostCard';

type PulseRun = {
  id: string;
  title: string;
  starts_at: string;
  court_name: string | null;
  location: string | null;
  max_players: number;
  players?: string[];
};

type PulseProps = {
  featuredPost: NetworkPost | null;
  nextRun: PulseRun | null;
  onQuickTake: () => void;
  onStory: () => void;
};

function featuredPhoto(post: NetworkPost | null) {
  return post?.media_urls?.find((url) => !/\.(mp4|webm|mov)(?:[?#]|$)/i.test(url)) ?? null;
}

export function RCHPulseHero({ featuredPost, onQuickTake, onStory }: Pick<PulseProps, 'featuredPost' | 'onQuickTake' | 'onStory'>) {
  const image = featuredPhoto(featuredPost);
  return <section aria-label="RCH Pulse featured activity" className="rch-pulse-hero">
    <div className="rch-pulse-hero-copy">
      <span className="rch-pulse-eyebrow"><FaBolt aria-hidden="true" /> THE PULSE OF VIRGINIA</span>
      <h2>People. Basketball.<br /><span>Culture. Community.</span></h2>
      <p>A living timeline of highlights, conversations, creators and moments. The community stays connected beyond game day.</p>
      <div className="rch-pulse-hero-actions">
        <button type="button" onClick={onQuickTake}><FaPlus aria-hidden="true" /> Share a Quick Take</button>
        <button type="button" onClick={onStory}><FaPlay aria-hidden="true" /> Add a Story</button>
      </div>
    </div>
    {featuredPost ? <Link href={`/social/post/${featuredPost.id}`} className="rch-pulse-feature">
      {image ? <img src={image} alt="Featured community post" loading="lazy" /> : <div aria-hidden="true" className="rch-pulse-feature-art"><FaComments /></div>}
      <div className="rch-pulse-feature-info">
        <span><FaBolt aria-hidden="true"/> COMMUNITY SPOTLIGHT</span>
        <strong>{featuredPost.body?.trim() || 'See what the RCH community is sharing.'}</strong>
        <small>Join the conversation <FaArrowRight aria-hidden="true" /></small>
      </div>
    </Link> : <Link href="/discover" className="rch-pulse-feature rch-pulse-feature-empty">
      <div aria-hidden="true" className="rch-pulse-feature-art"><FaPeopleGroup /></div>
      <div className="rch-pulse-feature-info"><span>DISCOVER THE COMMUNITY</span><strong>Find your next connection, conversation or open run.</strong><small>Explore RCH <FaArrowRight aria-hidden="true" /></small></div>
    </Link>}
  </section>;
}

export function RCHPulseMoment({ nextRun, featuredPost }: Pick<PulseProps, 'nextRun' | 'featuredPost'>) {
  if (!nextRun && !featuredPost) return null;
  const date = nextRun ? new Date(nextRun.starts_at) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
    : 'Date to be announced';
  return <section aria-label="What is happening on RCH" className="rch-pulse-moments">
    <div className="rch-pulse-moments-heading">
      <div><span className="rch-pulse-eyebrow"><FaBolt aria-hidden="true"/> LIVING MOMENTS</span><h2>Beyond the post.</h2><p>Explore real activity happening across RCH.</p></div>
      <Link href="/discover">Explore <FaArrowRight aria-hidden="true" /></Link>
    </div>
    <div className="rch-pulse-moment-grid">
      {nextRun && <Link href={`/runs/${nextRun.id}`} className="rch-pulse-moment-tile">
        <span className="rch-pulse-moment-tag"><FaCalendarDays aria-hidden="true"/> UPCOMING RUN</span>
        <strong>{nextRun.title}</strong>
        <small>{dateLabel} · {nextRun.court_name || nextRun.location || 'Venue details on event page'}</small>
        <span className="rch-pulse-moment-bottom">{nextRun.players?.length ?? 0} joined <FaArrowRight aria-hidden="true"/></span>
      </Link>}
      {featuredPost && <Link href={`/social/post/${featuredPost.id}`} className="rch-pulse-moment-tile rch-pulse-moment-conversation">
        <span className="rch-pulse-moment-tag"><FaComments aria-hidden="true"/> COMMUNITY CONVERSATION</span>
        <strong>{featuredPost.body?.trim() || 'The latest conversation on RCH'}</strong>
        <small>{featuredPost.comments?.length ?? 0} comments · {featuredPost.reactions?.length ?? 0} reactions</small>
        <span className="rch-pulse-moment-bottom">See the discussion <FaArrowRight aria-hidden="true"/></span>
      </Link>}
    </div>
  </section>;
}
