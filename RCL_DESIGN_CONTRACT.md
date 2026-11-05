# RCH — Unified Blue / Glass / Metal Design Contract

Approved direction: a more serious, professional blue-metal identity for the installed PWA, with deep navy foundations, polished cobalt actions, ice-blue states, and restrained translucent glass highlights. Rich City Hoops remains a basketball social platform; Rich City League remains its competition property.

## Visual foundation

`src/app/rch-brand-tokens.css` is the palette source. Historical CSS layers consume these shared tokens. `rch-blue-metal.css`, loaded last in the root layout, owns the new glass finish and replaces residual crimson accents in the PWA chrome. Glass is reserved for navigation, app bars, cards, and controls; photographs, videos, partner logos, team identity, badge tiers, and operational data colors stay untouched.

| Role | Value | Application |
|---|---|---|
| Canvas | #07111f | Deep navy page foundation |
| Surface | #0b1a2a | Navigation, cards, forms and panels |
| Raised surface | #12263a | Nested panels and hover surfaces |
| Border | #29435b | Cool metal panel edges and input boundaries |
| Primary action | #287fe0 | Cobalt gradient buttons with white labels |
| Accent text | #8ecbff | Readable links and selected indicators on navy |
| Main text | #f4f8fc | Headings and primary copy |
| Supporting text | #cbd8e5 | Descriptions |
| Muted text | #9aafc3 | Metadata and captions |

Use the supplied, self-hosted Barlow Condensed 800 font for H1/H2 and display titles. Use the system/Inter body stack for paragraphs, labels, inputs, tables and buttons. Card titles remain readable normal sans where their density demands it. Font license is in public/fonts.

Cards use 10px corners, thin cool-metal borders, subtle upper-edge highlights, and restrained shadows. Frosted glass is low opacity and keeps labels legible. Primary buttons use 8px corners and a minimum 44px target. No blanket recoloring of images, videos, team badges, medal tiers, charts, shot maps or partner logos. Blue identifies interaction; errors also require explicit labels/icons so color is never the only signal.

## Navigation

Signed-in mobile navigation uses Home, Runs, League, Draft and Profile. Fantasy remains a quick menu destination; guests retain Home, Runs, League, Draft and Fantasy. Public Home opens `/`; signed-in app Home opens `/social`. Profile opens the real account/profile route or sign-up for guests. Discover, Create, Fantasy, media, messages and staff tools remain available through existing menus. Preserve account-aware links and route protections. Navigation active states must not mark Home selected while viewing a profile.

Browser chrome includes the same persistent four-item mobile bar, safe-area padding and enough page clearance. Desktop retains its broader navigation. Preserve dedicated scorebook and production-studio controls.

## Page families

- **Public homepage:** large basketball imagery; YOUR CITY. YOUR GAME.; Join Free primary and Explore Runs secondary; live event, player and news data; accurate empty states. Mobile hero gives the image breathing room, stacks CTAs and removes the competing quick-link rail.
- **Runs, courts, crews and World:** deep navy panels, cobalt interactions, strong condensed titles. Preserve map coordinates, scene geometry, court preview/arena transitions, filters, join/host behavior and verification. Do not invent games, attendance or territorial ownership.
- **Profiles and social:** preserve user photographs, cover imagery, highlights, music, role identity, following and edit actions. Apply consistent headings, panels and selected tabs. No sample player or invented statistics from the mockup may enter real profiles.
- **Discover:** dark readable cards and dark native controls with visible placeholders, active filters and empty states. Keep the scoped native-input contrast protections.
- **League, standings, rankings, fantasy and draft:** share typography, action palette and surfaces; preserve statistics, competitive rules and earned gold/status colors.
- **News, media and shop:** imagery leads; supporting metadata is quiet but readable; stable card geometry. Keep live camera/broadcast and media controls functionally isolated.
- **Account, signup, settings and messages:** same visual system, clear form boundaries and focus indicators, retained errors and loading states. Never change authentication to simplify a mockup.
- **Admin, Command Center and professional tools:** shared blue-metal surfaces and cobalt actions; retain dense tables, operational controls, role gates and chart distinctions. Royaltee retains its organization branding inside the common platform.
- **PWA:** manifest, browser theme color, and generated home-screen icon match the blue-metal canvas. Existing install, push, offline and launch behavior remain intact.

## Accessibility and delivery

Normal text token pairs must meet 4.5:1 contrast. Primary labels are white on cobalt. Accent text uses the lighter token, never the button-fill token on dark surfaces. Focus rings stay visible, touch targets remain comfortable, reduced-motion preferences are respected, and photographs are not tinted globally.

Validate TypeScript, production build, existing behavioral tests, CSS parse/token references and actual palette contrast. Inspect mobile and desktop renderings when preview infrastructure is available. Root inheritance is coverage, not evidence of a manual review of each page. Record verification limitations in the PR and route coverage document.

## October 26 approved PWA Home visual flare

`rch-court-flare.css` provides the scoped app-chrome/Home art direction: metallic RCH lettering, a self-hosted decorative court texture, blue story rings, underline feed tabs, restrained press feedback, and edge-to-edge member media on phones. `rch-blue-metal.css` supplies the current glossy blue and glass finish. Keep real feed imagery unaltered and preserve its aspect ratio. The approved generated mockup is a visual reference only; its people, captions, engagement and imagery are not production content. Maintain Home/Runs/League/Draft/Profile navigation, all five post actions, keyboard focus, forced-color branding and reduced-motion behavior. Other page bodies retain their existing layouts.
