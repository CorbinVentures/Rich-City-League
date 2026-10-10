# RCH animated global loading screen

The global loader is wired to the committed `public/brand/rch-loader.mp4` (720×720, 24 fps, 4-second H.264 loop) and `rch-loader-poster.svg` (reduced-motion or no-video fallback). The production file was optimized from the approved `RCH_Animated_Logo_Living_Loop.mp4` without changing the logo design.

## Interaction
- Installed mobile PWA boot: intro displays while app content initializes.
- Client-side route clicks / browser history: delayed transition (325 ms) only when navigation is slow.
- Content readiness releases overlay, with a 4-second absolute fail-safe.
- Account recovery routes are excluded.
- Muted, inline, auto-looping video; reduced-motion preference uses the SVG fallback.
- Overlay includes accessible status text and a keyboard skip control.

The loader reuses `PWALaunchIntro`, not a second standalone loader, and `src/app/loading.tsx` remains a lightweight Suspense skeleton beneath it.
