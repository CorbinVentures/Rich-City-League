# RCH Scorebook Academy — Test Mode

## Product experience
The dedicated Scorebook PWA at https://rch-scorebook.vercel.app/ adds a visible **✦ TEST / TRAINING** launcher to both login and authenticated screens. Direct link: https://rch-scorebook.vercel.app/?training=1. Users do not need official game-scoring permission to practice.

The full-screen Academy matches RCH Command Mode styling and visibly states **TRAINING ENVIRONMENT · NOT LIVE**.

1. **Guided Training:** 13 interactive steps teach player selection, made shots, linked assists, misses, rebounds, opponent fouls, undo, bench substitutions, box score, and completion. Wrong guided actions are rejected with coaching text.
2. **Free Practice:** Simulated Northside Aces vs Capital Comets with eight entirely fictional players per team. Users can record shooting and defensive statistics, do substitutions, undo, run the clock, change periods and inspect a local box score.
3. **Local progress:** Stores the practice session on the current device using localStorage. A completion marker represents lesson progress, not official scoring credentials.
4. **Isolation guarantee:** The training engine and UI do not call any official scoring API, Supabase RPC, fetch, or external service. Demo events never appear in official games, standings, or player reputations.
5. **Scope:** This is a teaching simulation of stat concepts, not a production scorer certification or a complete model of every league-specific basketball rule.

## Version control and separate deployment
The Academy code is under `apps/rch-scorebook/training-engine.js`, `training-mode.js` and `training-mode.css`, with tests in `tests/rch-scorebook-training.test.ts`.

The original standalone Scorebook Vite project is still API-deployed rather than continuously Git-connected. GitHub merges alone do **not** deploy Scorebook; deploy the three Academy files to the Vite `public/` folder. In `index.html`, load `/training-mode.css` after `/command-mode.css`, then `/training-engine.js` before `/training-mode.js`, without changing original official `src/main.js` or any scoring RPC.

## Release gates
- Green Application Quality and Vercel integration checks before merging.
- A Scorebook preview deployment built and Ready, then production promotion.
- Test training button in the sign-in screen and while authenticated.
- Finish all 13 guided steps, start freeplay, practice subs and undo, and reload to verify local training progression.
- Test iPad landscape/portrait and mobile sizes. Confirm the official Scorebook still functions for authorized scorers.
- Record before/after counts of official game events; the training environment must not add official rows.
- Real game scoring still requires a separate authorized test game with verified rosters and scorer credentials.