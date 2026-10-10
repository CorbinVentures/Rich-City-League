# RCH global loader — verified source media

The **correct** loader is the original user-uploaded cinematic navy-and-gold RCH logo animation, with the skyline, river reflections, orbiting gold light and the original RICH CITY HOOPS lettering. Do not substitute the simplified SVG-like R icon.

Expected files:
- `public/brand/rch-loader.mp4` — 1,563,086 bytes, 512×512, H.264, 30 fps, 4.000 sec
- `public/brand/rch-loader-poster.webp` — frame 0 from the exact MP4

SHA-256 for `rch-loader.mp4`:
`4b44b1430cc9618ad7d1ee088f979d8c69e70a35fb1fde1263ef4e2234e456c3`

The old 106,260-byte placeholder at the same MP4 path is **not** the intended video. Replace that file with the verified user upload before merging this PR. The poster should also match the video so mobile users never see a different logo while video initializes.

The loading overlay is reused by `PWALaunchIntro` for installed PWA startup and slow route changes. It releases on content readiness and has a 4-second fail-safe. Skip and reduced-motion behavior remain intact.
