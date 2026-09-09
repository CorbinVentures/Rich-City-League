# Rich City League Platform

## Overview

Rich City League is a **modern, mobile-first sports league management platform + basketball social network** for Richmond, Virginia basketball.

This is the complete digital ecosystem for RCL:
- League management (teams, games, standings, statistics)
- Basketball social network (posts, follows, community)
- Player and team profiles
- News and media hub
- Admin dashboard
- Registration system

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                  # Next.js app directory
├── components/           # Reusable React components
├── lib/                  # Utilities and helpers
├── types/                # TypeScript types and interfaces
├── hooks/                # Custom React hooks
├── utils/                # Helper functions
└── store/                # Zustand state management

sql/
├── migrations/           # Supabase database migrations
└── seed/                 # Seed data for demo

public/                   # Static assets
scripts/                  # Build and setup scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CorbinVentures/Rich-City-League.git
   cd Rich-City-League
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Supabase credentials in `.env.local`

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Supabase CLI workflow

The repository contains the complete Supabase project under `supabase/`: configuration,
versioned migrations, storage policies, cross-season integrity checks, and deterministic
fictional demo data. Install the
[Supabase CLI](https://supabase.com/docs/guides/cli), then run:

```bash
supabase start
npm run db:migrate
npm run dev
```

`npm run db:migrate` resets the local database, applies every migration, and loads
`supabase/seed.sql`. Use `npm run db:push` to apply pending migrations to a linked
remote project. To regenerate the checked-in TypeScript definitions after schema changes,
run `supabase gen types typescript --local > src/types/database.generated.ts` and update
the application import if you choose to use the CLI-generated output. The service-role
key and database password are server/CLI secrets; never expose them as `NEXT_PUBLIC_*`
variables.

For GitHub Actions deployment, configure these exact repository secrets:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token. The workflow passes it
  to `supabase link` and `supabase db push` for Management API authentication.
- `SUPABASE_PROJECT_ID`: the project reference for the dedicated Rich City League
  Supabase project. It is passed to `supabase link`; do not use another
  application's project.
- `SUPABASE_DB_PASSWORD`: the database password for that project. It is passed to
  `supabase link` when `SUPABASE_DB_URL` is not configured.
- `SUPABASE_DB_URL` (optional): a direct database connection URL. When configured,
  the workflow passes it to `supabase db push` and skips `supabase link`.

The workflow validates the local migrations and applies them to the configured
project; credentials are never stored in the repository or printed in logs.

### Production database deployment

1. Create a new, empty Supabase project specifically for Rich City League. Do not use
   another application's project.
2. In Supabase Authentication, keep email/password enabled and configure the production
   site URL and redirect URLs.
3. Copy the project reference, database password, project URL, and anon key into the
   appropriate GitHub/Vercel secret stores.
4. Add `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD` as
   GitHub Actions secrets. Add `SUPABASE_DB_URL` only when using a direct database URL.
5. Push the `supabase/` directory to `main`, or manually run the **Supabase** workflow.
   The workflow runs `supabase db push`; no tables or policies need to be created in the
   dashboard. Run `supabase link --project-ref "$SUPABASE_PROJECT_ID"` followed by
   `supabase db push` locally when deploying manually.

## Features

### Phase 1 Implementation

**TIER 1 — Core Platform**
- ✅ Authentication & Role-Based Access
- ✅ User Profiles & Players
- ✅ Teams & Rosters
- ✅ Seasons & Divisions
- ✅ Schedule & Games
- ✅ Standings
- ✅ Player & Team Statistics
- ✅ Responsive Navigation

**TIER 2 — Community**
- ✅ Posts & Comments
- ✅ Likes
- ✅ Follows
- ✅ Community Feed
- ✅ Player Profiles

**TIER 3 — Content**
- ✅ Media Hub
- ✅ News/Blog
- ✅ Community Spotlight
- ✅ Awards

**TIER 4 — Administration**
- ✅ Admin Dashboard
- ✅ Game Management
- ✅ Player Management
- ✅ Team Management
- ✅ Stat Entry
- ✅ Registration Foundation

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Environment
NODE_ENV=development
```

## Database Schema

See `supabase/migrations/` for the complete version-controlled schema. It includes:
- users
- profiles
- players
- teams
- seasons
- leagues
- divisions
- rosters
- games
- venues
- player_game_stats
- team_game_stats
- standings
- posts
- comments
- likes
- follows
- media
- news
- awards
- staff
- notifications
- commissioners
- registration_items

TypeScript definitions matching the public schema are in `src/types/database.ts`.

## Authentication & Roles

- **PUBLIC**: Unauthenticated users
- **PLAYER**: Registered players
- **COACH**: Team coaches
- **STAFF**: League staff
- **ADMIN**: Administrators

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
npm run start
```

## Deployment

The application is configured for deployment on Vercel.

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Sample Data

The seed data includes:
- 8 fictional Richmond basketball teams
- 100+ players
- Complete 2024 season schedule
- Game scores and statistics
- Player of the week awards
- Community posts and highlights
- News articles and media

**This is DEMO DATA** and can be replaced with real RCL data through the admin dashboard.

## Future Enhancements

- Advanced social features (direct messaging, notifications)
- Video hosting and streaming
- Advanced analytics and reporting
- Mobile app (React Native)
- Sponsorship management
- Ticket sales integration
- Merchandise integration
- Live game updates and scoring
- Integration with external stats services

## Contributing

This is the official Rich City League platform repository.

## License

MIT License - Rich City League

## Support

For issues or questions, please contact the development team.
