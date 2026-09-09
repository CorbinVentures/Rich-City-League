# Security hardening and authenticated QA

## Current audit conclusions

- The browser uses only `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No service-role key is referenced by
  application code.
- RLS remains enabled on the application tables and storage objects. Public
  reads are intentional for published league content; private writes are
  enforced by RLS rather than hidden controls.
- `handle_new_user`, `protect_profile_privileged_fields`, and
  `set_updated_at` are trigger-only functions. Migration
  `20260909000003_security_definer_privileges.sql` removes their default
  `PUBLIC` execute privilege and pins `set_updated_at` to `pg_catalog`.
- `is_admin`, `is_staff_or_admin`, `is_coach_of_team`, and `is_commissioner`
  remain executable by authenticated and anonymous database roles because they
  are called by RLS policies. Revoking those privileges would break policy
  evaluation; they use an explicit `public` search path and inspect
  `auth.uid()`-scoped records.
- `citext` is used by `profiles.username` and `registrations.email`. It is
  also used by the registration email type definition and its indexes or
  constraints. Moving the extension requires a controlled production
  migration review and is intentionally deferred.

## Dependency findings

The September 2026 audit reports:

- Production-only audit: one critical `next` finding and one high `postcss`
  finding.
- Full audit: the same production findings plus high `glob` and `minimatch`
  findings in development tooling.
- The installed Next.js version is `14.2.35`; npm reports the available
  remediation as `next@16.3.4`, a major upgrade. Do not use
  `npm audit fix --force` in this phase. Complete a separate Next.js 16
  compatibility review covering App Router, middleware, Supabase Auth,
  server actions, and deployment before upgrading.

## Authenticated test account requirements

Use existing accounts or secret-managed test accounts only. Never seed fake
production users or league records.

| Role | Required setup |
| --- | --- |
| Public | Signed out browser session |
| Player | Auth user linked to `profiles.role = player`, linked `players` row, and own registration |
| Coach | Auth user linked to `profiles.role = coach`, with `team_coaches` assignment and assigned team season |
| Staff | Auth user linked to `profiles.role = staff`, with approved test registration/game/stat fixtures |
| Admin | Auth user linked to `profiles.role = admin`, with the same non-production test fixtures |

Credentials must be supplied through CI/Vercel secret variables or an
approved local `.env` file and must never be committed.

## Role security test matrix

For every role, test both the rendered route and the direct Supabase request
against the production RLS boundary. A hidden or disabled control is not an
authorization test.

| Role | UI route scenarios | Database/RLS scenarios |
| --- | --- | --- |
| Public | Public pages render; `/dashboard` and `/portal/*` redirect to sign-in | Published rows are readable; registration, profile, and operational writes fail |
| Player | Own profile and registration are visible; own team/statistics are visible; portal operations is denied | Own profile/player/registration access succeeds; unrelated private records and staff operations fail |
| Coach | Assigned teams, rosters, games, and authorized statistics are visible; unrelated team and admin operations are denied | Assigned roster/team-season operations succeed; unrelated team mutations and admin-only writes fail |
| Staff | Registration, game, statistics, and content operations render | Authorized staff mutations succeed; profile role/status and admin-only staff changes fail |
| Admin | All authorized administration routes render | Full authorized administration succeeds; RLS still rejects malformed or cross-tenant references |

## Registration division blocker

`registrations` stores `season_id` and an optional `team_id`, but no
`division_id`. Division is currently represented directly by `divisions` and
indirectly for teams through `team_seasons.division_id`; a registration can
only be associated with a division by first assigning a team, which is not
safe for an unassigned applicant. This is a schema blocker:

> `registrations` cannot persist division assignment with the current schema.

Do not add `division_id` during this hardening phase. The smallest future
migration is an additive nullable foreign key from `registrations.division_id`
to `divisions.id`, with a composite season/division integrity constraint and
an application form update.

## Deferred production work

- Run the CodeQL workflow on GitHub and require a completed result.
- Obtain approved role accounts and execute the matrix against a safe staging or
  production fixture set.
- Review Supabase Security Advisor output for the production project after the
  migration is applied by the repository's approved deployment mechanism.
- Perform the controlled Next.js major-version upgrade review.
