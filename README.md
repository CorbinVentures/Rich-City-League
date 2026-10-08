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
`supabase/seed.sql`. `npm run db:push` is available for local or explicitly
manual development workflows only; it is not used to deploy production. To
regenerate the checked-in TypeScript definitions after schema changes, run
`supabase gen types typescript --local > src/types/database.generated.ts` and
update the application import if you choose to use the CLI-generated output.
The service-role key and database password are server/CLI secrets; never expose
them as `NEXT_PUBLIC_*` variables.

### Supabase preview migration gate

Before merging a pull request that changes `supabase/`, the Supabase native GitHub
Integration must create its preview branch and successfully apply every file in
`supabase/migrations/`. The preview branch is the required migration validation
environment for this repository; a local reset or static inspection alone does
not establish production readiness. Keep the pull request blocked from `main`
until the Supabase preview migration check succeeds.

The preview must also confirm that `supabase/seed.sql` runs successfully and
idempotently. The checked-in `supabase/config.toml` enables the intended seed
file (`[db.seed].enabled = true` and `sql_paths = ["./seed.sql"]`). Seed rows use
fixed demo identifiers and conflict-safe inserts, and contain no production
credentials or external side effects.

### Production database deployment

Supabase's native GitHub Integration is the only production database deployment
mechanism. Configure the integration for the production project and the `main`
branch. When changes are pushed to `main`, Supabase applies the versioned
migrations from `supabase/migrations/`; GitHub Actions never links to or pushes
the production database.
This GitHub Integration deployment is what processes pending production
migrations in timestamp order.

The `Supabase validation` GitHub Actions workflow is validation-only. It does
not authenticate to Supabase, link a project, or deploy migrations. Its local
Docker validation can be unavailable when the container registry rate-limits
image pulls; that does not change the required Supabase preview gate above.

The repository source of truth is:

- `supabase/migrations/` — versioned production schema changes
- `supabase/config.toml` — Supabase project and local tooling configuration
- `supabase/seed.sql` — deterministic local/demo seed data

Create the production project and configure its authentication and site URLs in
Supabase. Application runtime credentials belong in the appropriate Vercel
secret stores. The Supabase GitHub Integration, not repository secrets or a
custom workflow, deploys database migrations.

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
# Supabase public browser/server-session configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

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

The application is configured for deployment on Vercel. Add the following variables
to both the **Preview** and **Production** environments before deploying:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The public URL and anon key are safe for browser use; do not add a service-role key
to browser-exposed variables. If either variable is missing in a Vercel Preview
deployment, the application code is correctly configured; Vercel Preview
environment variables must be added/verified.

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
