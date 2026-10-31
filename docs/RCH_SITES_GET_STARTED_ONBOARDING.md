# RCH Sites Website Creator — Get Started onboarding

Status: **draft PR only**; no merge, production migration, payment activation or publishing permission changes.

## User experience

Old: Select tier → send partner-interest request → wait for review → only then see builder.

New: **Get Started** → sign up/sign in → choose Trainer, Coach, AAU/Team, or Organizer → select preferred Free/Amateur/Professional level → customize name/URL/headline/style → preview → **Save private website draft** → organization verification when ready to publish.

- New users can build and save a real website draft without first proving organization ownership.
- Starter records persist on the logged-in RCH account, so returning users resume editing.
- Preferred paid tiers are planning preferences, not automatic checkout. Users start on Free until paid features and billing are released.
- A public organization site requires an approved, claimed, verified organization and owner/manager rights. Publishing remains inside the existing Website Studio.
- If the account already manages an eligible organization and the organization has no existing site, the user may import the private design into Website Studio. Import does NOT publish.
- The import refuses to overwrite an existing draft or public website. The approved organization profile remains authoritative for the organization's name/identity.
- For organizations already listed, the workflow routes users to the existing ownership-claim process instead of duplicating a listing.
- For new organizations, the user requests *publishing verification* from the setup flow. It creates a structured item in the existing admin organization acquisition queue, associated with their account and saved design. The request is idempotent across duplicate submissions.
- Approval and organization claim are still staff/manual steps, never self-declared. The browser never receives RCH admin, main-site, other-tenant, Stripe, PayPal or Network billing permissions.
- Shared legacy links like `/network/partners/apply?siteTier=amateur` redirect to the builder. General Network partnership forms are unchanged.

## Application changes

- `/website-creator`: immediate Get Started links for all tiers.
- `/website-creator/start`: SEO noindex account-based three-step wizard with preview and save.
- `/api/rch-sites/starter`: server-authenticated single-profile GET, save, verification request and owner/manager-only import.
- `rch_site_starter_drafts`: per-user draft JSON, name, desired slug, preferred tier, timestamps and verification inquiry reference.
- Browser experience allowlists accept the new route in normal Safari/Chrome; this is only a presentation choice, not API authorization.
- Private starter records have RLS owner-only read and no direct customer mutations.
- Existing public `rch_sites`, official competitions, player rankings/REP, organization ownership and merchant payments are not changed.

## Release requirements

1. Migration applied and pgTAP run against a disposable local/staging database only first.
2. Application TypeScript/lint/build/Vitest green; include get-started contract tests.
3. Live-account QA: new signed-in adult → choose template → save → sign out → sign in → resume; no org required for draft.
4. Test cross-user private draft access, forged body `profileId`, origin/CSRF rejection, invalid tier/slug and duplicate verification requests.
5. Test eligible owner import to a fresh organization; deny visitor/editor/import on unverified org, deny overwriting existing organization websites and enforce slug collisions.
6. Confirm existing admin acquisition pipeline shows publishing verification rather than marketing/sponsorship intent. Approving an inquiry should not automatically grant a claim.
7. Do not activate website subscriptions, payment verification, new quotas, or unverified public sites by importing this feature.
8. Review privacy terms for storing staff applicant contact details and tenant onboarding data; users should never enter youth/athlete data into this initial wizard.

This removes **interest as the website start action**, without misrepresenting ownership verification as instant publication.
