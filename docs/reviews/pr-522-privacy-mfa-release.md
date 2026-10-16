# PR #522 — RCH privacy and MFA release verification

**Status: HOLD / DRAFT.** This checklist is a release gate, not evidence that a human completed interactive sign-in testing. No direct changes were made to the production database.

## What is protected

- Public and member-facing profiles have row visibility policies, blocking and friendship checks; direct Data API column grants deny phone, DOB and legal acknowledgment timestamps.
- Owner-only RPCs return contact details and account block lists; adult eligibility is a boolean checked in both Royaltee and creator payouts.
- Each member can enroll and remove time-based authenticator factors in Account Security. Password, social login and protected PWA paths redirect opted-in AAL1 sessions to a six-digit challenge.
- Admin and command workspaces require AAL2. Privileged profile edits, staff records, role approvals/assignment and global site settings require AAL2 at PostgreSQL RLS level.
- After an account has at least one **verified** factor, restrictive database policies also prevent AAL1 from accessing the 16 protected profile, content, messaging, moderation and account tables. Owner-only SECURITY DEFINER RPCs make the same check.

## Automated release gate

All checks must be GREEN on the **exact PR head commit**, not an earlier commit:

1. TypeScript, lint, production build and app unit tests.
2. Full chronological Supabase migration reset and pgTAP authorization tests.
3. Supabase branch preview migration status.
4. CodeQL, Vercel deployment readiness.
5. SQL proof from the preview: anon and authenticated cannot SELECT public.profiles.phone or public.profiles.date_of_birth; no user PII values retrieved during that proof.
6. Role/security test fixtures: AAL1 admin denied privileged writes; AAL2 admin allowed; members without MFA can update their own accounts; enrolled AAL1 denied private records; enrolled AAL2 permitted.

## Interactive preview validation required (not completed by automation)

- Regular member without MFA: password sign-in, account access, privacy settings, standard role request and sign-out.
- Regular member enrolls TOTP: QR/manual secret, invalid code, valid code, return to intended page and sign-out of other sessions.
- An enrolled member signs in again with email/password: blocked until MFA. Test a direct /messages link and iPhone installed PWA reopening.
- Social/OAuth sign-in: enrolled member receives the challenge and returns to the correct destination. New social users retain onboarding flow.
- Profile permissions: public guest, accepted connection, private owner, blocked counterpart, follower graph, posts, stories and blocked list.
- Admin without a factor: /admin and /command redirect to /account/security, without entering the workspace. After enrollment and verification, admin can enter and manage another member. AAL1 direct REST writes must fail.
- Staff and coach: existing scorebook workflow, approved staff assignment and Royaltee coach permissions continue to function. AAL2 required for privileged role changes where applicable.
- Royaltee adult-only eligibility and creator payout onboarding: an adult succeeds; an underage or missing DOB fails; neither path returns raw DOB.
- Recoverability: test member with multiple factors; test cancellation and confirmed removal. Confirm a formally verified account-recovery/support procedure *before* releasing mandatory MFA.

## Further hardening to track

- Audit privileged SECURITY DEFINER functions and API routes that use a service-role key: PostgREST RLS does not govern a SECURITY DEFINER function or service-role path unless it explicitly enforces equivalent checks.
- Review storage policies, sensitive tables not yet guarded, group messaging, media, finance, scorebook and staff actions for direct AAL1 bypass.
- Provide secure account recovery: Supabase's baseline authenticator flow alone does not guarantee an end-user recovery path after every factor is lost. Never bypass identity verification via a simple email/DM.
- Confirm logout and password-reset behavior across different devices and expired JWTs.

## Deployment and follow-up

1. Do not merge the draft PR or consider issue #521 resolved before interactive QA and final automated checks.
2. Confirm a support recovery owner and procedure so mandatory administrators are not permanently locked out by device loss.
3. After approval, deploy via normal migrations and confirm production column grants / account MFA policies and frontend auth redirects.
4. Reverify production permission checks **without querying real phone or birthday values**.
5. Reopen/rollback the release if onboarding, authentication, staff authority, or member privacy is regressed. Restore access only using an approved security-reviewed migration, not blanket GRANT SELECT.
