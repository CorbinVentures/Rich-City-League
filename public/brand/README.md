# RCH animated global loader asset

The global transition component is wired to `/brand/rch-loader.mp4` with this `rch-loader-poster.svg` as a safe fallback.

## Required media file

Copy the **already approved** `RCH_Animated_Logo_Living_Loop.mp4` into `public/brand/rch-loader.mp4` before shipping the final video-branded treatment. The player is autoplay + muted + playsInline + loop.

The original MP4 is a generated ChatGPT artifact; the GitHub connection can write text but does not accept container-local binary file paths. Until the MP4 is added, the SVG fallback appears with a subtle CSS animation, and no broken-video placeholder is shown.

Do **not** link production UI to temporary signed URLs or a ChatGPT sandbox URL.

## Behavior

- Full-screen loader on installed mobile PWA first boot.
- Intent-based overlay for slow internal route transitions and browser history navigation.
- No delay on fast navigation; delayed reveal prevents flashes.
- Releases on destination readiness, with a 4-second absolute fail-safe.
- Does not cover login/password recovery routes.
- Honors reduced-motion preferences.
- RCHExperienceGate continues to handle browser installation prompts.
