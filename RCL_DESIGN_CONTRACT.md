# Rich City League — Visual Source of Truth

The approved reference image is the canonical visual direction for the product.

## 1. Product shell
- Dark cinematic basketball platform.
- Fixed left RCL navigation on desktop/tablet.
- Fixed bottom navigation remains visible at supported compact/tablet widths.
- Mobile switches to bottom navigation + full-screen More drawer.
- Main content begins to the right of the desktop sidebar.
- Shared top bar: RCL mark/wordmark, search, notifications, profile/menu.
- No page may introduce a competing navigation system.

## 2. Brand tokens
- Background: #03070D / #050B12
- Panel: #071522 / #0A1B2A
- Blue: #159FFF / #0877ED
- Orange: #FF4F16
- Primary text: #F6F8FB
- Muted text: #7D90A3
- Hairlines: rgba(38,160,235,.24)
- Rounded corners: 12–16px
- Display type: condensed athletic/impact-style uppercase.
- UI type: geometric sans, bold, tracked uppercase labels.

## 3. Composition
Every public page follows:
1. shared RCL shell
2. cinematic page hero
3. orange section kicker
4. condensed white headline
5. blue/orange interactive accents
6. dark glass/metal panels
7. consistent 1px blue-tinted borders
8. consistent spacing rhythm
9. responsive mobile horizontal cards where appropriate
10. footer/navigation treatment from the source image

## 4. Home reference hierarchy
Header → cinematic hero → FIND YOUR COURT cards → NEXT GAME → STANDINGS → FEATURED PLAYERS → 804/community content.

## 5. Imagery
Photography should be cinematic Richmond basketball imagery: dark environments, blue shadows, warm orange practical light, players/courts/city texture. ContentAssetBackground and database photo URLs remain the source of dynamic media. Placeholder/unstyled stock imagery must not become the dominant visual treatment.

## 6. Interaction
- Orange = active/attention/live.
- Blue = navigation/action.
- Cards lift subtly on hover.
- No generic white cards.
- No unrelated color systems.
- Buttons, tabs, headings, panels, tables, filters, forms, and empty states must use the same visual tokens.

## 7. Page families
- League: Games, Teams, Players, Standings, Stats, Rankings, Seasons.
- Experience: Home, The Lab, Draft Night, Game IQ, Fantasy, Leaderboards.
- Community: Social, Communities, Friends, Messages, News, Media, Awards.
- Account: Profile, Dashboard, Orders, Shop, Notifications, Auth.
- Operations: Admin and Scorebook remain functionally specialized but inherit the same shell and tokens.

## 8. Enforcement rule
Existing functionality, data fetching, auth, RLS, Scorebook/Game IQ logic, and routes are preserved. Visual refactors must happen inside this system rather than creating one-off page designs.

## 9. QA gate
A page is not considered visually complete until:
- desktop shell matches the reference geometry
- compact/tablet shell matches the reference geometry
- mobile drawer/bottom navigation is consistent
- headings, cards, buttons, tables and empty states use the tokens
- dynamic images have a deliberate crop and fallback
- no horizontal overflow exists
- production build passes
