# RCL Social Platform Transformation

## Product model

Rich City League is a social basketball network powered by a real league, not a league website with social features attached.

### Public experience
- Keep the polished league-facing website for SEO, schedules, standings, stats, sponsors, recruiting, and public credibility.
- Public visitors can discover games, teams, players, news, and league history without an account.

### Member experience
- Signed-in members enter the RCL Network.
- The default member home is the personalized social feed.
- The person is the primary identity; the league is the structured competition layer underneath the network.
- League actions should become social objects: game results, player performances, badges, REP milestones, roster moves, rankings movement, draft picks, runs, and community activity.

## Primary member navigation
1. Home — personalized basketball feed
2. Explore — people, teams, creators, communities, runs, highlights, and trending activity
3. Create — post, media, story, highlight, or run
4. League — schedule, games, standings, stats, rankings, teams, draft, fantasy, and Game IQ
5. Profile — identity, REP, badges, posts, highlights, stats, career, media

Messages and notifications stay globally accessible from the app header.

## Information architecture rule

Social shell → League ecosystem inside it.

Do not make every member route inherit the visual hierarchy of a sports-league website. League-specific pages may retain the sports/broadcast presentation inside the League section.

## Transformation phases

### Phase 1 — Member shell
- Make `/social` the signed-in member home.
- Redirect authenticated visits to `/` into `/social` while leaving the public homepage unchanged for logged-out visitors.
- Replace authenticated primary navigation with Home / Explore / Create / League / Profile.
- Unify Social, Friends, Messages, Communities, Runs, Notifications, and Profile around one member-app navigation model.
- Remove duplicate social menus and league-site navigation from the member experience.

### Phase 2 — League-to-feed activity engine
- Convert finalized games, stat leaders, ranking changes, badges, REP milestones, roster moves, draft activity, fantasy outcomes, and runs into feed-ready activity objects.
- Give official/system activity a clear RCL identity and deep links back to the source data.
- Avoid duplicate event generation and only publish official league events after authoritative state transitions.

### Phase 3 — Profile as basketball identity
- Make profiles the central identity surface.
- Organize profile content into Posts / Highlights / Stats / Career / Badges / Media.
- Surface REP, level, role, team, follow/message actions, league history, and verified accomplishments above the fold.

### Phase 4 — Explore and discovery
- Build one discovery graph for people, creators, teams, communities, runs, highlights, and trending topics.
- Rank discovery using activity, relationship, REP, geography/league relevance, and freshness rather than static directories.

### Phase 5 — Social creation
- One global Create action.
- Support post, photo/video, story, highlight, run, and community post from the same entry point.
- Contextually prefill league objects when sharing games, players, achievements, or stats.

### Phase 6 — Retention loop
- Personalized notifications.
- Suggested follows and communities.
- Game-day social prompts.
- REP and badge progression.
- Weekly basketball recap and profile milestones.

## Non-negotiables
- Preserve current authoritative league/stat/scorebook data flows.
- Preserve public SEO routes and canonical sports pages.
- Do not duplicate social functionality in separate shells.
- Mobile should feel like an app, not a responsive league website.
- Desktop should use a social three-column layout where context supports it.
- The league generates the stakes; the network generates the daily habit.
