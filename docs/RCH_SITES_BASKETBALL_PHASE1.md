# RCH Sites — Basketball-first Website Creator Phase 1

Status: branch-only review candidate. Do not merge, deploy, enable billing, expand quotas, or activate unfinished tools without release approval.

## Problem and approach

The previous generic site-builder presentation emphasized pages, storage and staff count. Basketball trainers, coaches, AAU teams and organizers need a clear outcome at every tier without reading or navigating all possible back-office modules.

- **Free ($0):** publish a basketball presence, receive inquiries, and manage simple free training bookings.
- **Amateur ($19/mo or $190/yr):** designed for group training, adult program registration, coaching, rosters, and program communications.
- **Professional ($49/mo or $490/yr):** designed for divisions, tournament brackets, venue calendars and larger operations.
- Prices remain unchanged. These describe differentiated *plans*, **not** a claim that every module has shipped.

## Scope of this PR

1. Central basketball tool catalog keyed to the existing `RCH_SITE_PLANS` and `RCH_SITE_RELEASED_FEATURES`.
2. Four basketball-aware starter templates with role-specific default headline, about section, CTA and existing approved page sections.
3. Concise preview tool cards in new-site setup and Website Studio, varying by selected site type.
4. Organization HQ shows released tools linked to existing manager-authenticated APIs; displays future paid benefits as noninteractive planned cards.
5. Website pricing copy explains outcomes and explicitly separates currently released features from planned features.
6. Billing navigation retains the authorized organization selector.
7. Pure tests confirm tool release gating and page integration.

## Safety invariants

- **No new API routes**, migrations, schema/permission changes or payment alterations.
- Only the existing inbox and appointment pages are linked as active basketball tools.
- No planned tool acquires a URL, nor is a selected tier in a starter draft treated as a subscription.
- The client-side catalog is presentation only. Existing per-endpoint authorization, organization verification, RLS and Stripe server-derived paid status remain authoritative.
- Official Rich City League competitions, player stats, REP, fantasy, RCH TV storage and main PWA are unchanged.
- Never collect youth registrations until a guardian authorization, privacy and consent system has been separately reviewed.
- No paywall or restriction on existing published Free websites. Existing booking usage limits remain as deployed.

## Validation

- GitHub Application quality (TypeScript, lint, production build, unit tests).
- Isolated RCH Sites browser suite where triggered.
- Vercel preview must report READY at the final PR SHA.
- Manual owner review of trainer, coach, AAU and tournament layouts and phone widths.
- Confirm real account with multiple organizations sees only its own data and correct plan; confirm no pseudo-live links for registration, brackets, divisions or marketing.
- Verify client bookings, publication and independent PayPal links continue as before.

## Next phase, separate approval

Implement adult registration, reusable calendars and group sessions with server-side grants, atomic usage limits, cross-tenant isolation and consent tests. Follow with team operations and tournament tools only after those APIs exist.
