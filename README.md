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

See `sql/migrations/` for complete schema including:
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
