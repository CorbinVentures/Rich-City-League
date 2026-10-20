# RCH Runs Virginia World 3.0 — Court Preview → Enter Arena

## Release contract

Approved option C: keep the current real MapLibre map mounted; selecting a court opens a compact panel on the map; a deliberate gesture expands the panel; Enter Arena navigates to a real court; only actual scheduled events can open a Run Room. No competition tables, rewards or titles are created by this visual update.

## User-visible behavior

1. The user selects a Virginia city and a sourced court pin. The camera stays on the real WGS84 point; no synthetic coordinates or generalized city-center court pins.
2. A compact preview appears over the map (bottom sheet on phones, right overlay on desktop). It shows verified facility metadata, real crew control, actual upcoming Run count, and a working **Enter Court Arena** action.
3. The user swipes the handle up or selects **See Court Details** to expand. The expanded view shows 1v1/2v2/3v3 **certified holder** data from \`get_rch_court_master_belts\`, verified defense counts, scheduled Runs and the source/access disclosures.
4. Escape while expanded collapses. Escape while compact closes. Close-button dismisses. Reduced-motion users receive immediate state transitions instead of entrance/zoom animation.
5. \`/runs/courts/[slug]\` presents real crew standings, independent Court Master competitions, upcoming Runs, sourced facility details and the **Legacy Wall**, built only from actual \`rch_court_master_history\` / resolved \`rch_court_takeovers\` records.
6. Court Arena and Court Preview pass the selected city and court context through event navigation when applicable; the Run Room offers a return link to the same Court Arena, which links back to Virginia World and the selected court.
7. Map viewport is saved in session storage on actual map movement, keyed to selected region. Layer filters persist for the session, with 24-hour camera expiration. No live location tracking or server history is generated.

## Grounding constraints

- The generic night-court hero is branded RCH artwork **not the real facility's photograph** and is labeled as such.
- A sourced court record **does not** mean the location is staffed, reserved, presently open, safe for a specific activity or affiliated with an upcoming game.
- Registered, accepted, proposed and resolved challenges are distinct from certified match outcomes.
- \`get_rch_court_masters\` produces a statistical ladder; the Preview uses only **certified** belts to present a crown holder. If none exist, display *No certified title holder*.
- Real REP awards and 2× multipliers remain governed by the existing server ledger. UI never grants or estimates them.
- A team emblem displays only when the actual controlling crew has a storage-backed logo; otherwise use a neutral crown placeholder.
- No invented player counts, facility ratings, photos, distances, amenity badges or game results.

## QA before promoting to production

- [ ] Narrow phone (320px), modern iPhone and desktop: tap pin, compact preview CTA in view, expand, collapse, close, responsive viewport and overlays
- [ ] Low-end mobile: real map pans and zooms smoothly, preview does not remount MapLibre or block the page after dismissing
- [ ] Map fallback when OpenFreeMap or pinned MapLibre CDN unavailable: readable venue list works
- [ ] Return to selected city/court and previously chosen layer after exiting Arena; camera restored without a jump to a random city
- [ ] Accessibility: marker, tab and button labels; focus; Escape; 44px control targets; reduced motion
- [ ] Court without coordinates appears in the list but **not** an invented marker
- [ ] Empty court: no certified masters, no controlling crew, no upcoming game; no placeholders resembling fake people
- [ ] Court with actual controlling crew and logo; correct division-specific certified belts and defenses
- [ ] Open/full/cancelled Runs; logged-out Run Room; signed-in Join/Leave; Next Up with real game-day privileges
- [ ] Staff/official privileges and rejected scores still authorize through current RPC/RLS rules
- [ ] Tablet and PWA view against global menu/bottom dock stacking; map attribution remains visible and source correctly labeled

## Scope

No database migrations. Existing \`AccurateVirginiaMap\`, \`RunsWorldGame\`, \`CourtMasterTitles\`, crew standings, verified event pages and score audit controls remain authoritative. Human device testing is not inferred from CI; these checks are explicitly outstanding until performed.
