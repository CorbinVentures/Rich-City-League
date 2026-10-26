# RCH — Unified Charcoal / Crimson Design Contract

Approved reference: the Home / Runs / Profile mockup in the October 23, 2026 design conversation. This supersedes the previous light-blue Social World palette. Rich City Hoops remains a basketball social platform; Rich City League remains its competition property.

## Visual foundation

`src/app/rch-brand-tokens.css` is the palette source. Historical CSS layers consume these shared tokens rather than independently choosing blue values. `rch-unified-mockup.css`, loaded last in the root layout, owns shared type, card geometry, navigation, actions, and responsive homepage treatment.

| Role | Value | Application |
|---|---|---|
| Canvas | #0b0c0e | Page and navigation background |
| Surface | #141618 | Cards, forms and panels |
| Raised surface | #202326 | Nested panels and hover surfaces |
| Border | #44484e | Panel edges and input boundaries |
| Primary action | #c8102e | White-label primary buttons |
| Accent text | #ff768c | Readable links and selected indicators on charcoal |
| Main text | #f5f5f3 | Headings and primary copy |
| Supporting text | #d0d1d4 | Descriptions |
| Muted text | #a6a8ad | Metadata and captions |

Use the supplied, self-hosted Barlow Condensed 800 font for H1/H2 and display titles. Use the system/Inter body stack for paragraphs, labels, inputs, tables and buttons. Card titles remain readable normal sans where their density demands it. Font license is in public/fonts.

Cards use 10px corners, thin visible borders, and restrained shadows. Primary buttons use 8px corners and a minimum 44px target. No blanket recoloring of images, videos, team badges, medal tiers, charts, shot maps or partner logos. Crimson identifies action; errors also require explicit labels/icons so color is never the only signal.

## Navigation

Signed-in mobile navigation uses Home, Runs, League, Draft and Profile. Fantasy remains a quick menu destination; guests retain Home, Runs, League, Draft and Fantasy. Public Home opens `/`; signed-in app Home opens `/social`. Profile opens the real account/profile route or sign-up for guests. Discover, Create, Fantasy, media, messages and staff tools remain available through existing menus. Preserve account-aware links and route protections. Navigation active states must not mark Home selected while viewing a profile.

Browser chrome includes the same persistent four-item mobile bar, safe-area padding and enough page clearance. Desktop retains its broader navigation. Preserve dedicated scorebook and production-studio controls.

## Page families

- **Public homepage:** large basketball imagery; YOUR CITY. YOUR GAME.; Join Free primary and Explore Runs secondary; live event, player and news data; accurate empty states. Mobile hero gives the image breathing room, stacks CTAs and removes the competing quick-link rail.
- **Runs, courts, crews and World:** charcoal panels, crimson interactions, strong condensed titles. Preserve map coordinates, scene geometry, court preview/arena transitions, filters, join/host behavior and verification. Do not invent games, attendance or territorial ownership.
- **Profiles and social:** preserve user photographs, cover imagery, highlights, music, role identity, following and edit actions. Apply consistent headings, panels and selected tabs. No sample player or invented statistics from the mockup may enter real profiles.
- **Discover:** dark readable cards and dark native controls with visible placeholders, active filters and empty states. Keep the scoped native-input contrast protections.
- **League, standings, rankings, fantasy and draft:** share typography, action palette and surfaces; preserve statistics, competitive rules and earned gold/status colors.
- **News, media and shop:** imagery leads; supporting metadata is quiet but readable; stable card geometry. Keep live camera/broadcast and media controls functionally isolated.
- **Account, signup, settings and messages:** same visual system, clear form boundaries and focus indicators, retained errors and loading states. Never change authentication to simplify a mockup.
- **Admin, Command Center and professional tools:** shared neutral surfaces and crimson actions; retain dense tables, operational controls, role gates and chart distinctions. Royaltee retains its organization branding inside the common platform.
- **PWA:** manifest and browser theme color match the charcoal canvas. Existing install, push, offline and launch behavior remain intact.

## Accessibility and delivery

Normal text token pairs must meet 4.5:1 contrast. Primary labels are white on crimson. Accent text uses the lighter token, never the button-fill token on dark surfaces. Focus rings stay visible, touch targets remain comfortable, reduced-motion preferences are respected, and photographs are not tinted globally.

Validate TypeScript, production build, existing behavioral tests, CSS parse/token references and actual palette contrast. Inspect mobile and desktop renderings when preview infrastructure is available. Root inheritance is coverage, not evidence of a manual review of each page. Record verification limitations in the PR and route coverage document.

## October 26 approved PWA Home visual flare

`rch-court-flare.css` is the final scoped app-chrome/Home art-direction layer: metallic RCH lettering, a self-hosted decorative court texture, crimson story rings, underline feed tabs, restrained press feedback, and edge-to-edge member media on phones. Keep real feed imagery unaltered and preserve its aspect ratio. The approved generated mockup is a visual reference only; its people, captions, engagement and imagery are not production content. Maintain Home/Runs/League/Draft/Profile navigation, all five post actions, keyboard focus, forced-color branding and reduced-motion behavior. Other page bodies retain their existing layouts.
