# Rich City League professional-season authority — November 2027

**Approved commissioner planning statement (October 29, 2026):** Rich City League's first new professional season is **planned to begin in November 2027**. Opening night has **no confirmed calendar day**. Do not state that pro games have begun or that registration and tryouts are currently open without live, verified records.

## Authoritative rollout
- RCH social community, Runs, creator tools, and independent Commonwealth Cup activity operate outside the professional season; they are not official pro games or automatic entry into the draft.
- Tryout series may run throughout 2027. **Official tryouts are planned for summer 2027.** Dates, locations, costs and eligibility are announced individually when verified.
- **Draft Night follows official tryouts** and leads into player roster formation; preseason franchise allocation may be publicly previewed without any live player selections.
- **The professional season starts in November 2027**, month committed as planned, day TBA. The first season is informally labeled 2027–28, but season end date and competition schedule are not yet published.
- Fantasy scoring during official games begins only when the professional season and corresponding Fantasy season are activated.

## Enforcement and source of truth
- `src/lib/rcl-pro-season.ts` contains the public planning month and copy. It intentionally has no artificial calendar day.
- Supabase `public.site_settings.key='rcl_pro_season_timeline'` holds the planning record (status `planned`, month `2027-11`, exact day null). Treat the app constant and this record as synchronized planning values; a confirmed day must be approved and coordinated in both.
- `rcl_2027_inaugural_draft_order` holds the independent preseason four-round snake allocation; it is **not** a live draft.
- Legacy/imported `public.seasons` rows, including the December 2026–April 2027 Rich City League 2.0 row, must be preserved for history and audits. They are **not** the November 2027 professional season. Public registration and League Center live previews must not use them as the upcoming pro campaign.
- Do not create an official 2027 season with a fabricated November 1 start date merely because the DB requires `start_date`. The commissioner must confirm the **exact** first game/start date and end date before staff create the actual playable season record in League Setup.
- When the official pro season record exists, league staff associate approved active franchises, configure tryouts/pool, load the established order into an authorized SETUP draft, and pass draft readiness checks before opening.

## Public communications rules
Always call November 2027 **planned** until final scheduling is announced. Do not imply November 1 is opening night. Clearly distinguish social/Runs activity, historical league records, official pro Draft Night, and Fantasy. Automated newsletter and official daily social posts must follow the same policy.
