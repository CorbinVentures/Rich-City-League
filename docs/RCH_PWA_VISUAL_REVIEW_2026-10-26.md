# RCH PWA usability and visual review — October 26, 2026

## Assessment

The charcoal/crimson identity and program emblems provide a recognizable brand. The main remaining usability problem is competing tasks: players should reach their feed or available games before promotional content and advanced tools. This is a partial live walkthrough plus a source review, not a certification of the installed PWA.

## Evidence and coverage

Live production was inspected in a signed-out desktop browser: homepage, public Pulse, Runs, My Crew entry, League, Draft, Fantasy entry and Discover. The browser did not expose an installed iOS/Android PWA session. Private account actions were not submitted.

Source review covered the PWA experience gate, manifest launch route, shared header/drawer, Home timeline, Runs, Discover, notifications and profile disclosure. Existing regression tests cover additional message, community, media and settings contracts. Passing those tests is not equivalent to a visual walkthrough.

| Surface | Finding | Disposition |
| --- | --- | --- |
| Home | Manifest launches `/social`; timeline has For You/Following, stories and composer. No promotional journey appended by PlatformChrome. | Preserve. Signed-in visual check pending. |
| Navigation | Five bottom program tabs are repeated in the menu while common secondary destinations require digging through All features. | Replace repeated menu shortcuts with labeled icons for Discover, My Crew, Create, RCH TV, Communities and Join RCL. Keep five tabs and full directory. |
| Runs | Live first viewport is consumed by actions, recommendations and a large weekend promotion before city selection and game listings. | Move recommendations and weekend promotion after listings. Keep reward conditions, handlers and data intact. Move league cross-promotion into More run tools. |
| Discover | Search and category labels are clear. Live public browser displays a white Personalize results panel with unreadable summary; all 224 listings are rendered in the inspected state. | Follow-up: repair browser-shell style coverage; consider incremental display without changing ranking. Not verified as installed-PWA defects. |
| League | Clear league title and schedule/team entry points, but repeated destinations and zero-value fan metrics still add clutter. | Follow-up: prioritize season state and scores; disclose fan metrics when relevant. |
| Draft | Live public browser shows cramped/unspaced status and stat panels. An inactive draft still displays control/selection framing for a guest. | Follow-up: verify shared layout rules in both shells; provide a concise spectator empty state while preserving authorized team controls. |
| Crew | My Crew correctly preserves its intended destination in the sign-in redirect. Sign-in displayed “Unable to load your session. Please retry.” | Authentication investigation needed; no conclusion that all users or installed PWAs are affected. |
| Fantasy | Guest reaches member-access. Sign-in retains `next=/fantasy`; Create account link shown there lacks that destination. | Follow-up: preserve intended destination through registration, then test private fantasy workflow. |
| Profile / notifications | Source uses optional sections for photo, role, music and notification settings. | Preserve; verify keyboard and save/read actions in a signed-in session. |

## Changes in this branch

- Runs brings city selection and available games before recommendations and the weekend campaign.
- Runs headline explains the immediate task in one line.
- Menu shortcuts use readable labels with icons, two columns, 64px minimum height and visible keyboard focus.
- Menu wording is consistent; mobile navigation is labeled RCH.
- Existing league-join test checks the preserved destination and label rather than obsolete promotional wording.

No database schema, auth policy, reward calculations, ranking algorithms, RSVP/check-in handlers, role visibility or five-tab destinations changed. The recommendation component stays mounted under native details as before, preserving its preferences callback.

## Release checks

TypeScript passed. ESLint passed with repository warnings. Vitest passed: 111 files, 773 tests. Local environment uses Node 24 while the project specifies Node 22; CI must validate the declared runtime. Build result is recorded in the PR.

Before merging, inspect the preview at 320/375/390/430px and iPad portrait/landscape. Confirm no horizontal scrolling, bottom safe-area coverage, readable text at increased text size, visible focus, and drawer close/focus return. Use an installed signed-in PWA to test cold launch into Home, post composer/cancel, messages, notifications, profile editing, Runs search/filter/detail/RSVP, crew navigation and Fantasy. Use non-production test records for writes.

The live observations above are from production before this branch. No after-change screenshot or installed-device visual verification was available in this review. Do not describe this branch as deployed or the full application as visually certified.
