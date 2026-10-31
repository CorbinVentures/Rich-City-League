# RCH TV Phase 3: controlled Cloud Recording + Adaptive Playback Pilot

## Executive rollout status

This code deploys a **disabled-by-default integration**. It does **not** activate new streaming providers, spend money, upload existing videos, automatically publish media, or promise complete full-game recording. The existing LiveKit public free broadcast and Supabase original-file playback paths continue.

## 1. Server-side cloud recording

The existing RCH LiveKit producer authenticates as an RCH administrator. The server-only route \`/api/rch-tv/recording\` authorizes each request with Supabase \`auth.getUser()\` and \`is_admin()\`. It supports:

- \`GET ?mode=live_games|the_pulse\`: configured/active status for that fixed channel
- \`POST {mode,action:"start"}\`: verify there are no active Egresses in the room, start RoomComposite Egress to **private S3-compatible storage**
- \`POST {mode,action:"stop"}\`: stop an active Egress on that same named channel before ending the broadcast

**Output is never given to the browser**, and the server never returns S3 credentials. Recording files remain outside the public RCH TV library. Studio status indicates starting/finalizing, not completion or guaranteed file integrity.

**A LiveKit RoomComposite recording ordinarily ends when the room empties, but users should still explicitly stop and verify.** The current RCH producer streams a single camera. Scoreboard overlays are rendered on viewer clients and are not burned into the recording. Test this specifically before any sponsored broadcast.

### Required server-only environment settings (all must be present to enable)

- \`RCH_TV_RECORDING_ENABLED=true\` — **leave unset** until budget, credentials and field tests approved
- \`LIVEKIT_URL\` (existing \`wss://\` URL), \`LIVEKIT_API_KEY\`, \`LIVEKIT_API_SECRET\`
- \`RCH_TV_RECORDING_S3_ENDPOINT\` (full HTTPS custom endpoint)
- \`RCH_TV_RECORDING_S3_REGION\`, \`RCH_TV_RECORDING_S3_BUCKET\`
- \`RCH_TV_RECORDING_S3_ACCESS_KEY\`, \`RCH_TV_RECORDING_S3_SECRET_KEY\`

Use a **separate private recording bucket and least-privilege upload credentials** with hard account/provider spending limits, automatic file retention, and auditable access. Do **not** casually use Supabase Storage S3 access keys: the standard long-lived server S3 keys can access every bucket and bypass RLS. Prefer a dedicated scoped S3-compatible bucket such as R2 or a dedicated narrowly scoped S3 IAM identity. Do not put these secrets into \`NEXT_PUBLIC_\`, GitHub files, chat, or public headers.

### Before enabling

1. Approve a strict monthly cap for both the Egress transcode minutes and storage. Set provider-level budgets/alerts. Some provider plans have finite Egress session time limits, so test with a 130-minute staged event (or the length of an actual game) and confirm continuous output or a safe documented split workflow.
2. Set up private bucket and least-privilege secrets, then enable the feature flag only in a controlled preview environment first. No changes to a live Supabase bucket are part of this PR.
3. Verify admin-only GET/POST, that missing credentials are treated as unavailable, no duplicate Egress starts, and that a producer failure does not leave accidental Egress billing running.
4. Start a 2-minute rights-cleared test on an actual camera and second viewer device, then stop. Check object integrity and playback out of band. Verify whether empty-room auto-stop works for the chosen LiveKit plan and that finalization is complete.
5. Only after multiple verified tests and documented cost limits, explicitly approve the production flag.

If the configured service is unhealthy, the producer's Go Live action blocks. If disabled, the existing independent-backup requirement remains.

### Known limitations

There is no session-cost hard stop implemented in this code or server reconciliation after a producer loses connectivity. Provider-side duration ceilings, charge limits, and operator alerts remain mandatory. The server currently checks for already-active Egress but does not implement a cross-process atomic lock against concurrent requests. Limit producers operationally to one; introduce an atomic production lock before broad external access. An Egress starting successfully does **not** mean the output file has finished or become playable. There is no webhook, persistent recording ledger, cloud-to-Supabase import, or automated rights clearance yet. No recording is automatically published.

## 2. Adaptive video option

The existing public \`/media\` continues showing the same videos at no additional charge from this deployment. An additional optional identifier format is supported in the existing \`media.storage_path\` field:

\`cloudflare-stream:<32-character hexadecimal video UID>\`

The server constructs a tightly validated embed from \`NEXT_PUBLIC_RCH_TV_CF_CUSTOMER_CODE\`; the public app shows Cloudflare's own embedded adaptive player only for an approved customer subdomain. It never accepts arbitrary frame URLs. The admin can import a reviewed, Cloudflare-account-hosted UID **as a draft only**. Streaming must be purchased, uploaded/encoded, previewed and licensed separately. No video is uploaded by the draft form. Cloudflare auto-encoding is not part of RCH's existing Supabase TUS upload path. Manually attach a poster image; remote Stream iframes cannot be locally canvased for a thumbnail.

The public customer code is an identifier, not an API token. Keep all actual billing/API keys private. Hosted videos are not shown on RCH TV until an admin explicitly publishes the record after verifying rights, preview and supported devices. The public player is still free to view; adding adaptive delivery does not add membership checks or create premium entitlements.

### Cost estimates for planning only

As of the 2026-10-27 Stream pricing page:
- Stream storage: prepaid increments of **$5 per 1,000 stored minutes monthly**
- Delivery: **$1 per 1,000 delivered video minutes**
- Example: 900 minutes stored + 120,000 delivered minutes ≈ **$125/month** of these two metered categories; this is not a full business cost forecast and excludes unrelated provider/production costs.

LiveKit pricing depends on plan and usage:
- The Build plan has 60 included recording/import transcode minutes shared with ingest; Ship has 600 included shared minutes, with video overages listed at **$0.02/min** at the time of review.
- For a two-hour fully billable Ship-plan video recording, the marginal transcode charge would be roughly **$2.40**, plus plan, storage and distribution fees. Verify invoice, billing thresholds, plan and retention before making commitments.

**Do not enable both metered services in production until an owner sets a defensible monthly cap and confirms baseline demand.**

## 3. Acceptance gates

- Server unit tests and security assertions pass; TypeScript/lint/build pass
- Unauthorized recording status/start/stop requests fail without credentials
- On disabled flag, existing live browser stream still works with a verified separate recording
- Real producer and second viewer test on physical devices; verify audio/visual integrity
- Private object is available after finalization and inaccessible anonymously
- Document actual invoice costs per 120-minute event, storage minutes, delivered minutes
- Stream preview is confirmed on Safari iOS, Chrome Android and desktop
- Admin import creates **draft** only; public RCH TV must not show draft or unlicensed media
- No paid membership/paywall changes, payout obligations or public rights exposure
- Revisit with cost/benefit and recording reliability results before enabling on production
