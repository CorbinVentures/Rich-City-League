# Site-wide polish review — September 28, 2026

Base: `0db339afe8c259994c85f26d7d560351464b46df` on `main`.

## Scope and status

Reviewed the source route inventory (91 page files), shared navigation and styles, public homepage data presentation, forms, metadata, loading and failure states, and literal internal links. Production's access gateway and sign-in screen were inspected in the browser. The remaining rendered-page review is blocked by the preview password/member sign-in flow; this is not a claim that every authenticated workflow or mobile layout has passed browser testing.

## Changes

| Area | Problem addressed | Result |
| --- | --- | --- |
| Shared typography | Many 8–11px interface labels and a tablet stylesheet that miniaturized the homepage | Small labels raised to at least 12px; navigation uses 14px; tables, spacing and narrow layouts improved |
| Visual consistency | Global color and border overrides erased local button/selection states | Removed conflicting overrides while retaining the existing dark basketball identity |
| Navigation | Drawers lacked modal keyboard behavior; active links matched unrelated prefixes; profile and highlights links were inaccurate | Shared native modal drawer with focus restoration and Escape handling, segment-aware active states, corrected destinations and skip link |
| Homepage | Hardcoded member identity, fabricated notification indicator, stock portraits presented as players, invented jersey numbers and games-behind values | Session-based identity, honest missing-photo states, real jersey data, calculated games behind and standings scoped to one season/division |
| Empty states | Empty schedules were labeled as loading; news could be blank | Accurate schedule, standings, player and news messages |
| Forms | Unlabeled inputs and silent save failures | Accessible names added; Film Room, Challenges and Communities have visible labels and loading, saving, success, failure and signed-out states |
| Saved work | Film/community drafts could disappear after failure | Clear draft only on successful creation, prevent duplicate submissions, show actual account/device save status |
| Error recovery | No shared app-level loading, error or not-found experience | Branded loading, recoverable error, root-error and 404 screens |
| Metadata | Duplicate page titles and missing names for key client routes | Page-specific titles/descriptions; private account pages retain or receive noindex metadata |

Film Room link input is limited to HTTP(S). Challenge results and player assessments reject invalid numeric values. Supabase table definitions and relevant access policies were checked read-only; no database schema, production records or authentication controls were changed.

Social media selection now allowlists supported MIME types and size, gives local previews only for validated base64 media, and derives upload extensions from the MIME type. Preview-wall middleware keeps `/auth/*` reachable even when preview authentication configuration is temporarily unavailable, while protected routes still return a clear 503 in that state.

## Verification

- `npm run type-check`: passed.
- `npm run lint`: passed with existing hook-dependency and raw-image warnings.
- `npm test`: 19 test files, 60 tests passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Literal internal-link source scan: no unresolved route targets found. Dynamic destinations and signed-in navigation still need runtime review.

Local checks used the available Node 24 runtime; repository CI uses its configured Node 22 runtime. Existing tests do not constitute end-to-end verification of the new UI states.

The first hosted CodeQL pass reported four DOM text to HTML findings in the existing Social media-preview path after the page was touched. The preview now uses a MIME allowlist and validated base64 data URLs instead of `URL.createObjectURL`; the branch will be rechecked by CodeQL after this update.

## Remaining browser review

Before treating this as fully polished, review the deployed branch after unlocking preview access:

1. Homepage, directories, game center, standings, player/team details and news at desktop and narrow widths; check long names, empty data and horizontal overflow.
2. Drawer open/close, Tab/Shift+Tab containment, Escape, focus restoration, skip link and mobile bottom-navigation clearance.
3. Signed-in Film Room, Challenges and Communities success/failure flows with approved test data.
4. Member profile, social, messages, notifications, shop/orders and authorized admin/scorebook screens.
5. Error/404 screens, visible focus, readable contrast and reduced-motion behavior.

The global stylesheet still contains legacy rules, and existing hook/image lint warnings remain technical debt.
