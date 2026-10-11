# RCH TV direct broadcasting — first release

RCH TV streams directly inside `/media`, without sending spectators to YouTube or Restream. The broadcaster works in `/admin/rch-tv/studio` (administrator role required).

## Connect the media server

Create a project at [LiveKit Cloud](https://cloud.livekit.io), or host a compatible LiveKit server. In RCH's Vercel project configure these **server-only** variables for the production and preview environments:

- `LIVEKIT_URL`: project WebSocket endpoint, e.g. `wss://your-project.livekit.cloud`
- `LIVEKIT_API_KEY`: server API key
- `LIVEKIT_API_SECRET`: server API secret

**Never put keys in a `NEXT_PUBLIC_` environment variable, the database, GitHub, or a chat message.** Redeploy Vercel after configuring. If credentials aren't connected, the site remains offline and the studio's Go Live action returns a descriptive configuration error; it must not pretend to broadcast.

LiveKit carries a single browser camera and mic feed to viewers. The site signs 10-minute room tokens on the server, restricts producer roles to authenticated RCH admins, and issues subscribe-only tokens for spectators while a channel is marked active.

## Broadcast a game

1. Log in as administrator and open `/admin/rch-tv/studio`.
2. Select **Live Games**. In Safari on iPad or a supported desktop browser, grant video/microphone permissions.
3. Tap **Start preview**, choose an available video/mic input, and **Refresh preview** to switch devices.
4. Set the team names, scores, period, clock, program title, sponsor, lower third, overlay preset and accent color.
5. Tap **Publish graphics**. When you are ready, tap **Go live**. A separate viewer can watch `/media#live-games` without a paid membership.
6. Tap **End broadcast** when the event finishes.

## Broadcast The Pulse

Select **The Pulse**, set the episode name, topic and guest, start your camera preview, publish overlays and tap **Go live**. The public player appears on `/media#the-pulse`.

## Canon / external cameras

For a Canon with clean HDMI output, connect an HDMI-to-USB UVC capture interface to a **compatible computer**. If its input appears in the browser camera list it can be selected. iPad USB-C UVC and Safari camera-input selection support depend on the specific iPad, iPadOS version, capture hardware and browser; do not promise every Canon/iPad combination works. When incompatible, use the iPad's built-in camera or a laptop with the capture device.

## Real limitations of this release

- Overlays are rendered on the RCH viewer and preview **on top of** the single video feed; they are not burned into the camera stream or a recording.
- Multi-camera switching, remote podcast guests, full program compositing, hardware-encoder RTMP ingest, automatic replay recording and Egress output/storage are **not yet configured**.
- On-air state is updated in Supabase and polled roughly every six seconds. An abrupt browser termination can leave the channel marked active briefly; in that case viewers see no video until another admin marks it offline. Use the **Mark channel offline** control.
- Studio is admin-only; grant collaborators dedicated producer roles in a later release.
- For real event deployment, test on physical iPad and Canon capture hardware with **two separate viewer devices** and evaluate LiveKit plan limits and bandwidth.
