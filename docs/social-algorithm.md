# RCL Social Feed Psychology Framework

The RCL social platform should use psychology to make the community feel alive, not to manipulate users.

## Five design pillars

### 1. Intermittent variable rewards
Use **healthy discovery variance** rather than addictive reward loops. The feed should periodically introduce different relevant posts, creators, runs, highlights, and community conversations so users do not see the exact same content order every visit.

Implementation direction:
- Stable exploration slots that rotate on a time bucket.
- Creator/topic diversity so one popular account cannot dominate.
- Occasional discovery of a relevant new player/team/community.
- Never fabricate likes, comments, viewers, followers, or activity.

### 2. Social validation + belonging
Make participation visibly meaningful to the basketball community.

Signals/features:
- Real reactions and comments.
- Follow relationships.
- Team/community membership.
- Shoutouts, player spotlights, teammate recognition.
- Replies that bring people back into an actual conversation.

### 3. FOMO
Use genuine time sensitivity:
- Live games.
- Runs filling up.
- 24-hour stories.
- Upcoming events and registration windows.
- Game-day conversations.

Avoid fake scarcity, deceptive countdowns, or notifications designed solely to create anxiety.

### 4. Social proof / bandwagon effect
Show **real** evidence of community activity:
- Reaction counts.
- Comment counts.
- Attendance/RSVP counts when verified.
- “12 people from your community are here” only when the underlying data is real.
- Trending topics based on actual activity.

Do not inflate counts or imply popularity that does not exist.

### 5. Identity expression + impression management
Give players tools to build a basketball identity:
- Player cards and profiles.
- Position, jersey number, team, stats.
- Badges and earned milestones.
- Highlights and game clips.
- Runs played.
- Community contributions.
- Custom profile media.
- Career/legacy progression.

The profile should answer: **Who are you on the court? What have you done? Who knows you? What are you building?**

## Feed ranking model

Current client-side ranking uses:
- 34% recency
- 20% real engagement
- 34% relationship/context signals
- 8% media richness
- up to 16% exploration variance

The relationship/context portion includes:
- followed creators
- the user's own posts
- Richmond/804 basketball community relevance

This is intentionally a starting model, not a permanent formula. Once RCL has enough event data, the model can be calibrated using measured outcomes such as meaningful comments, follows, run participation, saves, profile visits, and return sessions.

## Product guardrails

The algorithm should optimize for **meaningful basketball community participation**, not raw screen time.

Do not:
- manufacture social proof;
- conceal chronological/following views;
- create fake scarcity;
- use shame or anxiety to force engagement;
- penalize users for taking breaks;
- use sensitive personal attributes for ranking.

Provide clear user controls for Following/Latest views and notification preferences.

## Event instrumentation to add

Track privacy-conscious, non-sensitive events:
- feed impression
- meaningful dwell/read
- reaction
- comment
- share
- save
- follow
- profile visit
- run view
- run RSVP
- game view
- highlight play
- community join
- notification open

Use aggregated signals to improve relevance while avoiding sensitive profiling.
