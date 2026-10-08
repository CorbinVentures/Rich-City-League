# RCL — Social World Design Contract

This document is the visual and information-architecture source of truth for RCL.

## 1. Product identity
RCL is a basketball social platform first.

- The everyday product is a social world for local basketball people.
- Rich City League is the flagship and premier competition property inside RCL.
- Discovery connects people to players, teams, runs, events, organizations, media and opportunities.
- Organization tools support exposure and publishing, but the consumer product must never feel like a business directory.
- Membership and merch are native parts of the basketball lifestyle, not interruptions.

## 2. Primary navigation
The same five destinations anchor desktop and mobile:

1. Home — the social feed
2. Discover — find basketball
3. Create — add something to the world
4. Runs — find or host basketball activity
5. League — Rich City League competition

Profile, Messages, Notifications, My Hoops, Communities, Membership, Shop and organization tools are secondary destinations.

Global navigation answers “Where am I going?”
Page navigation answers “What can I do here?”

## 3. Brand character
The product should feel cool, trustworthy, premium, human and social.

Avoid:
- dark esports/gaming treatment as the default
- neon decoration
- dense directory grids as the primary experience
- every heading being uppercase athletic display type
- multiple equally strong calls to action
- excessive texture, glow and motion

Prefer:
- strong text/background contrast on every surface
- white cards on the cool canvas with subtle blue-gray borders and shadows
- blue selected states and primary actions
- real people
- clean editorial photography
- generous breathing room
- human-scale typography
- quiet surfaces
- familiar social-product patterns
- one obvious primary action

## 4. Color tokens
- Canvas: #F6F9FC
- Surface: #FFFFFF
- Soft surface: #EDF4FA
- Border: #D9E4EF
- Primary text / navy ink: #0F2547
- Secondary text / slate: #64748B
- Muted text: #8190A1
- Trust blue / primary action: #3B82F6
- Deep trust blue: #2563EB
- Prestige gold: #D4AF37
- Success: #2E8B70
- Danger: #C65361

Trust blue means action, navigation focus and platform confidence.
Slate supports secondary information without competing with the primary action.
White is the default card/panel surface. Do not place slate text on slate/gray panels.
Gold is reserved for earned/premium status.
Green means successful completion.
Red is reserved for true warnings/destructive actions.

## 5. Social composition
The Home feed is the center of gravity.

Priority:
1. stories / current activity
2. post composer
3. following / for-you / trending feed
4. people and runs
5. league activity
6. sponsored content when eligible and clearly disclosed

People and content should visually dominate chrome.

## 6. Rich City League
Rich City League receives a distinct prestige treatment inside the platform:
- stronger editorial hierarchy
- premium game storytelling
- statistics, standings and rankings
- league history
- fantasy / draft / Game IQ

The League is elevated, but it does not redefine the entire platform shell.

## 7. Monetization
Revenue should feel native:
- RCL+ appears as enhanced basketball utility
- Shop appears as culture / limited drops
- sponsored exposure appears as disclosed social/discovery inventory
- paid status never changes competitive credibility, REP, ratings, rankings, stats, awards or results

## 8. Interaction psychology
Every important screen should answer:
1. Where am I?
2. What is happening?
3. What should I do next?

Use:
- one dominant action
- clear progress
- real social proof
- obvious information scent
- restrained motion for feedback
- consistent active states
- familiar social affordances

## 9. Responsive rule
Desktop may use a calm left rail plus top bar.
Mobile uses the same five primary destinations in a persistent bottom bar.
The mental model must not change between homepage, Social, member pages and public pages.

## 10. QA gate
A release is not complete until:
- the five primary destinations are consistent
- active states match the page being viewed
- no competing navigation system appears
- key social surfaces use the light-neutral system
- mobile touch targets remain comfortable
- content remains readable at WCAG contrast targets
- no text is visually lost into a same-tone card/background
- the approved mockup palette is used across public, member, league, admin and PWA surfaces
- no horizontal overflow is introduced
- production build and automated checks pass
