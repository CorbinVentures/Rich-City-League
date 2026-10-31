# RCH TV Phase 4 — Game Day Production Center and recording safeguards

**Status:** Software rollout, not a certification of a full recorded game. The new protected admin page is `/admin/rch-tv/game-day`. No cloud recording is enabled and no additional paid video provider is activated by deploying this PR.

## Operator workflow (6 actions)

1. Choose Live Games or The Pulse, clear rights/venue/music and participant permissions, test equipment and network, begin independent camera recording.
2. Check setup in the Game Day Center. Checkboxes are saved **only on the current browser**, not proof of authorization, a shared team log, or a remote certification.
3. Open the existing Broadcast Studio, check audio/video preview and overlays, and Go Live. A separate second viewer device is required.
4. Record the show; do not leave the producer unattended. RCH TV cloud recording is still disabled unless its flag, S3 destination, session minutes and daily minute budget have all been explicitly configured.
5. End Live. Confirm LiveKit is offline and any private Egress has finalized; use the emergency cutoff if necessary.
6. Review the entire output, rights, picture and audio before uploading a draft to the existing RCH TV media library; publish separately.

## Defensive changes

- A **private, service-only** table `rch_tv_recordings` persists recording reservation, Egress ID, UTC deadline and verification state. A **database unique partial index** permits only one globally reserved/active record across the two channels. Only an authenticated RCH administrator can call the server endpoints; no direct public read/write policies are granted.
- Even when credentials are present, recording starts fail closed unless both server-only integers `RCH_TV_RECORDING_MAX_MINUTES` (1–180) and `RCH_TV_RECORDING_DAILY_CAP_MINUTES` (1–600, at least the session cap) are set. Daily quotas conservatively reserve the maximum allowable duration when a session starts. The code still honors `RCH_TV_RECORDING_ENABLED=true`; leave this unset until deliberate approval.
- `/api/cron/rch-tv-recording-safety` is scheduled every **5 minutes** and requires Vercel `CRON_SECRET` as a bearer token. It makes no external calls when cloud recording is off. When enabled it checks past-deadline/stalled reservations and attempts to stop any running Egress; if it cannot confirm termination it leaves an investigation note. **A five-minute watchdog is not a provider-enforced hard duration cap**; charges may extend beyond the deadline if the cron or provider fails. Configure provider-side billing thresholds and emergency alerts.
- Finalizing sessions are reconciled from LiveKit Egress results. The code only marks a file `verified` if LiveKit reports completion and nonzero file size **and** an authenticated S3 Signature V4 HEAD request confirms a nonempty file in the private object storage. An operator must still verify playable output, rights, graphics and delivery manually.
- An admin-only emergency control attempts to stop recording, delete the active LiveKit room and set the broadcast channel inactive. A partial failure returns explicit advice to verify LiveKit manually. It does not guarantee that cloud costs stopped until the provider confirms Egress termination.
- The dashboard exposes bounded session status but never output paths, storage credentials or downloadable private cloud footage.

## Configuration / migration / release

- New migration: `supabase/migrations/20261031022500_rch_tv_recording_safety_ledger.sql`. Apply before the code rolls to production. Verify RLS, grants, and partial uniqueness without running a billable Egress.
- Do not add `RCH_TV_RECORDING_ENABLED=true` yet. Existing `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and explicit private `RCH_TV_RECORDING_S3_*` settings are still required before any cost-bearing test.
- Set confidential `RCH_TV_RECORDING_MAX_MINUTES` and `RCH_TV_RECORDING_DAILY_CAP_MINUTES` only when the media budget is authorized. Record actual costs per full game. Default first controlled pilot budget recommendation: session maximum 150 minutes, daily reserved budget 300 minutes, with a separate hard vendor-level spend limit.
- Use the existing `CRON_SECRET`. New cron executions may count toward Vercel platform usage even while cloud recording is disabled.
- If recording is disabled, the existing independent-backup process remains mandatory. If cloud recording is enabled and safety settings are missing, the Studio blocks Go Live rather than silently streaming without the expected recording.
- In production: exercise unauthorized GET/POST (403), cron GET without credentials (401), admin access to Game Day Center, safely finish a nonbillable studio preview, and check all new dashboard states.

## Acceptance criteria not yet met by code alone

- Real 130–150 minute capture and restoration with a camera and second viewer device, including connection loss, app backgrounding and end-of-game checks.
- Verified S3 HEAD against **the actual configured storage provider** (no real provider credentials are activated by this change).
- Testing cutoff with an approved paid test session, an appropriate monthly budget, and at least one provider-level account charge alert.
- Confirmation that the public scoreboard/sponsor overlay appearance matches the promised client deliverable. LiveKit RoomComposite may not burn these client-side graphics into the MP4 output.
- Verified full-game playback on iPhone, Android and desktop. The UI checklist is a guide, not a substitute for these tests.
