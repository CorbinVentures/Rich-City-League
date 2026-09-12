export const faqCategories = [
  'GENERAL',
  'REGISTRATION',
  'LEAGUE INFO',
  'TEAMS',
  'PLAYERS',
  'COACHES',
  'SCHEDULE & GAMES',
  'RULES',
  'STATS & RANKINGS',
  'FANTASY',
  'SOCIAL',
  'NEWS & MEDIA',
  'APP & ACCOUNT',
  'SPONSORS',
  'HISTORY',
  'CONTACT',
] as const;

export type FaqCategory = (typeof faqCategories)[number];

export type FaqItem = {
  question: string;
  answer: string;
  category: FaqCategory;
  keywords: string[];
};

export const faqItems: FaqItem[] = [
  { category: 'GENERAL', question: 'What is the Rich City League?', answer: 'Rich City League (RCL) is a Richmond, Virginia basketball league and community platform. It brings league operations, player development, teams, games, standings, stories, and social connection into one place.', keywords: ['Richmond basketball league', 'RCL', 'basketball community'] },
  { category: 'GENERAL', question: 'When was the Rich City League founded?', answer: 'RCL identifies 2010 as the beginning of its story. The public record currently supports that origin year; additional milestones are intentionally left for league administration to confirm.', keywords: ['history', '2010', 'founded'] },
  { category: 'GENERAL', question: 'What is the mission of the RCL?', answer: 'The RCL exists to connect Richmond basketball culture: create meaningful competition, make league information accessible, and give players, coaches, fans, and community members a place to build their legacy.', keywords: ['mission', 'Richmond community'] },
  { category: 'GENERAL', question: 'Who can participate in the RCL?', answer: 'Players, coaches, fans, staff, and administrators each have a role in the RCL platform. Player registration and current-season eligibility are handled through the official registration flow and league administration.', keywords: ['players', 'coaches', 'fans', 'eligibility'] },
  { category: 'GENERAL', question: 'What makes RCL different from other basketball leagues?', answer: 'RCL is built as more than a game schedule. Official competition connects to player profiles, team history, stats, draft operations, community features, news, media, and a Richmond-first identity.', keywords: ['difference', 'features', 'Richmond'] },
  { category: 'GENERAL', question: 'How can I get involved?', answer: 'Start with the path that fits you: register to play, explore teams and coaches, follow games and standings, join the social community, or reach the league through the registration and platform channels.', keywords: ['join', 'get involved', 'community'] },
  { category: 'REGISTRATION', question: 'How do I register to play?', answer: 'Use the official registration page. Registration availability is driven by the current RCL season; when a season is open, submit the application and track its status from your dashboard.', keywords: ['registration', 'sign up', 'application'] },
  { category: 'REGISTRATION', question: 'Are players drafted into teams?', answer: 'Yes. RCL registration is not a simple choose-your-team recreational sign-up. A player moves through registration, evaluation, tryouts, draft eligibility, the draft, team assignment, and then the season.', keywords: ['draft', 'team assignment', 'tryouts'] },
  { category: 'REGISTRATION', question: 'What happens after registration?', answer: 'League staff review the application and the player follows the published evaluation and tryout process for the season. The player dashboard is the place to track available status and next steps.', keywords: ['evaluation', 'tryouts', 'status'] },
  { category: 'REGISTRATION', question: 'What are tryouts and evaluations?', answer: 'Tryout sessions give the league a consistent opportunity to observe players before draft eligibility is finalized. Attendance and official evaluation records are managed by league operations; private evaluation details are not published here.', keywords: ['tryouts', 'evaluation', 'OVR', 'Player IQ'] },
  { category: 'REGISTRATION', question: 'Can I request a team or choose my team?', answer: 'Players do not automatically choose a team. RCL uses a draft and team-assignment process so roster decisions can be made through league operations and coaches.', keywords: ['team request', 'draft', 'roster'] },
  { category: 'REGISTRATION', question: 'What if I miss tryouts or the registration deadline?', answer: 'Availability depends on the season and league administration. Check the registration page for the current season status and contact the league through the available platform channels before assuming a late application can be accepted.', keywords: ['deadline', 'missed tryouts', 'late registration'] },
  { category: 'LEAGUE INFO', question: 'Where is the Rich City League located?', answer: 'RCL is rooted in Richmond, Virginia. Current venues and game locations are shown through the official schedule and game center when they are published.', keywords: ['Richmond VA', 'location', 'venues'] },
  { category: 'LEAGUE INFO', question: 'Is RCL recreational, competitive, or both?', answer: 'RCL is designed to support organized competition and a welcoming basketball community. The current season, divisions, and official rules determine the competitive structure.', keywords: ['recreational', 'competitive', 'divisions'] },
  { category: 'LEAGUE INFO', question: 'What is the RCL player lifecycle?', answer: 'The league journey is registration, evaluation, tryouts, draft eligibility, draft, team assignment, season, and career history. Each stage connects a player’s participation to the official RCL record.', keywords: ['lifecycle', 'career history', 'draft pool'] },
  { category: 'TEAMS', question: 'How are RCL teams and rosters built?', answer: 'Teams are organized by season and division. Players are assigned through the league’s draft and roster operations, while official team pages provide the public team identity and history available for that season.', keywords: ['teams', 'rosters', 'divisions'] },
  { category: 'TEAMS', question: 'Can teams trade players?', answer: 'RCL includes league transaction and roster-status operations. Whether a transaction is available, who can request it, and when it can happen are controlled by league administration and official rules.', keywords: ['trades', 'transactions', 'roster status'] },
  { category: 'PLAYERS', question: 'What is an RCL Player Profile?', answer: 'A player profile is the public identity for an RCL participant. Where official data exists, it can connect a player to statistics, team history, badges, player IQ, exposure, and career context without exposing private account data.', keywords: ['player profile', 'career', 'exposure'] },
  { category: 'PLAYERS', question: 'What are Player IQ and OVR?', answer: 'Player IQ and OVR are RCL platform concepts used to describe player impact and rating. Values come from the league’s official player data and may not be available until enough official records exist.', keywords: ['Player IQ', 'OVR', 'ratings'] },
  { category: 'PLAYERS', question: 'How are statistics and ratings updated?', answer: 'Official game records are the source for public player statistics. Ratings, badges, and related indicators should be treated as RCL system data; this page does not publish a private or unverified scoring formula.', keywords: ['statistics', 'ratings', 'badges'] },
  { category: 'COACHES', question: 'How do I become an RCL coach?', answer: 'Coaching opportunities are managed by the league. Coaches can be assigned to teams and may have more than one assignment; contact league staff through the platform when you want to discuss an opportunity.', keywords: ['coach', 'head coach', 'assistant coach'] },
  { category: 'COACHES', question: 'What do coaches do in the RCL?', answer: 'Coaches support team operations, draft responsibilities, roster management, communication, and game-day preparation within the permissions given by the league. Official assignments live with the team record.', keywords: ['coach responsibilities', 'roster management', 'draft'] },
  { category: 'SCHEDULE & GAMES', question: 'Where can I find the RCL schedule and scores?', answer: 'Visit the Game Center for published schedules, game details, scores, results, and links to official team and player information. Availability depends on what the league has published.', keywords: ['schedule', 'scores', 'games', 'Game Center'] },
  { category: 'SCHEDULE & GAMES', question: 'Where can I see standings and game statistics?', answer: 'Standings, rankings, leaderboards, and game statistics each have their own public destinations. They are based on official RCL records and can be incomplete when a season or game data is still being processed.', keywords: ['standings', 'leaderboards', 'stats'] },
  { category: 'SCHEDULE & GAMES', question: 'What happens if a game is postponed?', answer: 'The official schedule and game record are the source of truth for status and updates. Check the Game Center for the latest published information rather than relying on an unofficial post.', keywords: ['postponed', 'game status', 'schedule'] },
  { category: 'RULES', question: 'Where are the official RCL rules?', answer: 'League administration controls eligibility, game, roster, conduct, discipline, trade, forfeiture, and appeal rules. This information hub does not invent rules; use the current official communication from RCL staff for a binding decision.', keywords: ['rules', 'eligibility', 'discipline', 'appeals'] },
  { category: 'STATS & RANKINGS', question: 'How are RCL standings and rankings calculated?', answer: 'Public standings and rankings are derived from official league records. The platform displays the current data available for teams and players; it does not replace an official league ruling about an exception or dispute.', keywords: ['rankings', 'standings', 'official stats'] },
  { category: 'FANTASY', question: 'Who can play RCL Fantasy?', answer: 'RCL Fantasy is fan-only. Fans can build fantasy teams around real RCL players and follow real league performance; player and coach participation in fantasy is not the purpose of this feature.', keywords: ['fantasy', 'fans', 'fantasy basketball'] },
  { category: 'FANTASY', question: 'Are fantasy statistics based on real RCL games?', answer: 'Fantasy is designed around real RCL players and official game statistics. The fantasy experience and its available scoring details are shown in the Fantasy destination when published by the league.', keywords: ['fantasy points', 'real players', 'statistics'] },
  { category: 'SOCIAL', question: 'What is RCL Social?', answer: 'RCL Social is the community layer for profiles, friends, teammates, following, posts, communities, reactions, messaging, notifications, and other league-connected interaction.', keywords: ['social', 'friends', 'community', 'messaging'] },
  { category: 'SOCIAL', question: 'Can I message teammates or follow players?', answer: 'Authenticated members can use the platform’s social and messaging features according to their account access and privacy controls. Public pages show only information intended for public viewing.', keywords: ['messages', 'follow', 'teammates', 'privacy'] },
  { category: 'NEWS & MEDIA', question: 'Where can I read RCL news and find media?', answer: 'Use News for published league stories and Media for the available photo, video, and highlight experience. Coverage is published as it becomes available; the hub does not promise media that has not been approved or posted.', keywords: ['news', 'media', 'highlights', 'interviews'] },
  { category: 'APP & ACCOUNT', question: 'What account roles does RCL support?', answer: 'The platform distinguishes PLAYER, COACH, FAN, STAFF, and ADMIN roles. Role-specific access is enforced by the application and database policies; your account only sees the tools and records it is authorized to use.', keywords: ['account', 'roles', 'player', 'coach', 'fan', 'staff', 'admin'] },
  { category: 'APP & ACCOUNT', question: 'How do I manage my RCL account?', answer: 'Sign in to access your dashboard, profile, notifications, messages, and role-specific tools. Public visitors can browse published league information without accessing private account data.', keywords: ['login', 'profile', 'notifications', 'privacy'] },
  { category: 'SPONSORS', question: 'How can a business support RCL?', answer: 'Businesses can explore sponsorship, advertising, community events, team support, media partnerships, and brand activations with the league. RCL staff can explain current opportunities; pricing is not published here.', keywords: ['sponsor', 'partner', 'business', 'advertising'] },
  { category: 'HISTORY', question: 'What is the RCL story?', answer: 'Built in Richmond and rooted in 2010, RCL is an evolving basketball and community movement. The public history is intentionally careful: confirmed origin information is shown, while unverified milestones are reserved for league administration to document.', keywords: ['history', 'origins', 'Richmond basketball'] },
  { category: 'HISTORY', question: 'What historical information still needs confirmation?', answer: 'The repository confirms Richmond, Virginia as the league location and identifies 2010 as the beginning of the RCL story. Championship totals, player counts, venue counts, season totals, attendance, partnerships, and awards are not presented until officially verified.', keywords: ['history source', 'verified data', 'statistics'] },
  { category: 'CONTACT', question: 'How do I contact RCL about registration, sponsorship, or a concern?', answer: 'Start with the official registration and account channels, then use the platform’s published league communication options for a registration question, sponsorship inquiry, player or team concern, or issue report. Include enough context for staff to route the request safely.', keywords: ['contact', 'registration', 'sponsorship', 'issue'] },
];

export const historyTimeline = [
  { year: '2010', title: 'FOUNDATION', body: 'The beginning of the Rich City League story in Richmond, Virginia.' },
  { year: '2010–2015', title: 'EARLY YEARS', body: 'Historical milestones for this period are awaiting confirmation from league administration.' },
  { year: '2016–2020', title: 'GROWTH', body: 'Historical milestones for this period are awaiting confirmation from league administration.' },
  { year: '2021–2025', title: 'EVOLUTION', body: 'Historical milestones for this period are awaiting confirmation from league administration.' },
  { year: '2026+', title: 'THE NEXT ERA', body: 'The next chapter will be documented as the RCL community continues to grow.' },
];
