# RCH Scorebook — iPad Command Desk

This folder versions the **additive, tablet-only user-experience layer** for the separate `rch-scorebook.vercel.app` application.

The stand-alone Scorebook was originally published to a separate Vercel Vite project by direct deployment of `src/main.js` and `src/style.css`. Until the entire Scorebook source is moved into GitHub and that project is Git-connected, these companion files document the tablet enhancement, but a merge here does **not** automatically deploy to Scorebook. To update Scorebook, include `tablet-score-desk.js` and `tablet-score-desk.css` in its Vite `public/` folder, load both from `index.html`, build, and promote the deployment. Keep the original Scoring JS unchanged.

## Courtside iPad experience

- Tablet breakpoint with coarse pointer (>= 740 CSS px), plus iPadOS touch fallback.
- Three-column landscape scoring desk: **player selection → full-stat one-touch actions → play-by-play/shot map/lineup tools**.
- Two-column with the review tools beneath the controls for narrow or portrait iPads.
- Pinned official scoreboard and persistent active player identification.
- First-ever tablet session enables full-stat mode so missed shots, defensive plays and turnovers aren't hidden. Switching to Quick manually afterwards remains possible.
- Immediate, DOM-only search filtering for visible game cards.
- Undo, shot location and play log shortcuts forward to the existing delegated actions. No additional scoring or database calls are made.
- No simulated or local tally of official scores; Supabase official RPCs remain unchanged.

## Release checks
- Test iPad landscape and portrait in the installed PWA (especially 9th-gen 10.2-inch and 11/13-inch iPads).
- Tap a real, authorized **test** player and score 2PT, 3PT, free throw, miss, rebound, assist, foul, turnover, and undo. Verify one official event for each, and RCH game center's same score and box score.
- Confirm clock, lineup substitution, finalization protection, reconnection, and multi-scorer overlap with a dedicated test game. **Do not finalize real games to test.**
- Verify full-stat UI renders at first launch without overriding a user-selected Quick mode later.
- Verify iPhone layout is unchanged.
- Current live database has no active roster assignments and no recorded game events, so this visual deployment alone cannot certify end-to-end game scoring.
