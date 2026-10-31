# RCH Media Transformation V1 — operating decision & release gates

**Scope:** RCH TV, RCH Studios, creator acquisition, and media sponsorship inventory. RCH Media is an internal operating division of the existing venture, not a new corporate entity or a second app.

**Policy:** Live Rich City League game broadcasts remain free. No new RCH TV subscription or automatic creator payout program is authorized by this change.

## What V1 implements

1. Published game replays and Richmond basketball archives lead the RCH TV page when content exists. Scheduled league fixtures are **not** advertised as confirmed broadcasts.
2. The public `/media/studios` page introduces four **pilot, indicative** commercial offers. These are inquiries rather than instant purchases or guaranteed inventory.
3. A prospective production or sponsorship client can submit an unauthenticated request through the **existing** `network_partner_inquiries` pipeline. Inquiry rows are tagged `RCH MEDIA / STUDIOS COMMERCIAL INQUIRY` in `goals`, `source=partner-application`, `status=new`, and classified as `media` or `business`.
4. Administrators can review inquiries using `/admin/network/acquisition`; media operations link to that CRM.
5. Public RCH TV copy distinguishes available videos, live broadcast availability, unlaunched programming, licensed film acquisition, and prospective creator compensation.
6. Admin publish actions explicitly request additional confirmation of required rights, including venue, music and participant releases. This **is not** a substitute for a documented license record.

No database schema changes, new recurring billing, transfers, payment promises, film purchases, or production deployment changes are included.

## Commercial structure and guardrails

| Product | Published pilot *starting estimate* | Contract type |
| --- | --- | --- |
| Game & Event Coverage | $850/event | Scoped production agreement |
| Community Media Partner | $350/month | Sponsor agreement |
| Game Night Presenting Partner | $750/event | Event-specific inventory agreement |
| Original Series Underwriting | $1,500/month | Rights-cleared series underwriting |

- The price displayed publicly is **not a checkout price** or binding offer.
- Sales verifies staffing, coverage hours, cameras, editing, travel, captions, turnaround, music, participant/event permissions, and distribution scope before quoting.
- Sponsorships cannot alter REP, official results, rankings, badges, or editorial findings.
- Collect at least a deposit for custom production according to a signed agreement. Do not record pipeline value as revenue.
- Production work should have a planned >=50% gross contribution margin after attributable labor, hardware, venue/crew, transport, editing, and distribution costs before accepting recurring obligations. Margin is a target, not an achieved metric.
- Quotes must distinguish one-time production fees, recurring sponsor commitments, and deliverables; do not promise minimum audience figures without audited analytics.
- Keep organizations' own website payments and accounts separate from RCH Studios' contracts.

## Editorial slate (no implied launch dates)

- **RCH game of the week**: rights-cleared game or Runs showcase; never describe non-professional activity as the 2027 pro season.
- **The Pulse**: pilot weekly interview / basketball talk format after scheduling and production validation.
- **RCH Archives**: accurately attributed, rights-verified historical footage with descriptive metadata.
- **Road to RCL 2027**: optional limited documentary project culminating in the November 2027 pro season; commission only after sponsor/budget validation.
- **Films & Documentaries**: curated licensed releases only. Do not pay for a general catalog at V1.

Do not commit to a weekly episode schedule until a repeatable production team, editorial pipeline, rights process, and budget exist.

## Mandatory content-rights procedure (operational, not automated)

Before uploading or publishing, a responsible RCH editor must record in an internal production/rights register:
- work, owner, signed grant, usage rights, territory, term/expiration, exclusivity, monetization permission, and removal contact;
- source footage/music clearances and any scorebug, images, logos or third-party clips;
- venue, event, participant, and guardian releases where applicable;
- distribution destinations (RCH TV, Instagram, TikTok, YouTube), sponsor integration authorization, and known restrictions;
- final clearance decision and approver, with a reference to the underlying signed documents.

**V1 limitation:** admin confirmation prompts do not store this register or technically block an administrator from falsely attesting. Keep commissioned or third-party footage in draft until the actual record is reviewed. A stronger server-enforced rights workflow remains a phase-two requirement.

## Content delivery production gates — NOT yet satisfied

- Successful 10-, 60-, and 120-minute playback tests on recent iPhone Safari, Android Chrome, desktop Chrome/Safari, and slow mobile bandwidth.
- Encode/transcode/packaging for browser compatibility, adaptive bitrate (HLS/DASH where appropriate), seek/restart behavior, captions, poster creation, structured error reporting, and storage/egress monitoring.
- Live game recording, replay publishing, camera failure recovery, operator roles, audio, and multistream load testing.
- Streaming test involving real devices and a minimum two external spectators; production bandwidth and plan limits documented.
- For any premium video: private object access, short-lived entitlement-checked playback authorization, server-side subscription validation, and verified revenue allocation. Public storage URLs cannot secure a paid title.

Current raw-file playback, LiveKit single-browser-camera studio and the 5GB upload path do **not** satisfy all the above. Do not sell premium playback or claim professional broadcast readiness until validated.

## Creator economics

Current 25% pilot pool is a design concept, not an authorized percentage of total RCL membership billings. Only rights-cleared, contracted, properly audited and demonstrably funded programming may participate in a future approved pool. Any commissioned work or sponsor-funded project should have separately agreed fees, rights, invoicing and payout review. Stripe Connect functionality is not proof of an approved or completed payout.

## 90-day commercial execution scorecard

| Metric | Owner / evidence | Target / release gate |
| --- | --- | --- |
| Playback start success | Engineering, two-device QA / logs | >= 98% in controlled pilot devices |
| Returning weekly viewers | Editorial, first-party de-duplicated analytics | Baseline first; improve week-over-week over 4 weeks |
| Full video cost per 1,000 minutes watched | Finance, actual delivery invoices | Measured and within an approved per-hour budget |
| Production contribution margin | Studios, signed scope + cost ledger | >= 50% target per accepted recurring package |
| Signed paying pilot sponsors | Sales, countersigned agreements | 2 within 90 days, **target not booking** |
| Profitable event assignments | Studios, paid invoices + reconciled labor | 2 within 90 days, **target not revenue** |
| Rights-cleared published titles | Editorial, license records | 100% of titles |
| Sponsor renewals | Sales, renewal contracts | Baseline after first completed period |

Track each deal as prospect → qualified → quoted → contracted → invoiced → collected → reconciled. Do not present contact-form submissions or contracted billings as collected cash.

## Acceptance and release sequence

- **V1 public UX**: no empty film catalog treated as released; only real content is featured; two primary actions, watch or inquire.
- **V1 inquiry**: anonymous insert allowed by existing RLS and data API grants, client validation and consent, admin pipeline visibility, no new permissions for users. Validate live inserts with test accounts; no customer-facing promise of automatic response.
- **V1 publishing**: confirmation prompt, actual rights verification by human editor, unpublished drafts not shown publicly.
- **V1 technical**: preview build, type-check, tests, protected routes, and production smoke check. Merge only after these are green.
- **V2**: encoded/adaptive long-form delivery, viewer analytics, actual video rights records, price/cost quoting and project/job management.
- **V3**: validated sponsorship reporting and programming profitability dashboards, only then evaluate premium entitlement integration with existing RCL membership rather than a separate TV checkout.
