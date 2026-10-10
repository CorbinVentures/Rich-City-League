# RCH loading screen media

The loader at `public/brand/rch-loader.mp4` is the **original cinematic Rich City Hoops animation uploaded by the user**, not the earlier simplified substitute.

Verified Git blob: `c05724c655b22f493801d895693215dacbc6acba`
Original source: `RCH_Animated_Logo_Living_Loop.mp4`
Size: **1,445,372 bytes**, 960×960, H.264, 24 fps, 4 seconds.

The production component references `/brand/rch-loader.mp4?v=original-20261010` to avoid stale PWA video cache.

No alternate graphic is shown during video startup or for reduced-motion users: only the literal team name **RICH CITY HOOPS** is displayed until video is ready. The earlier `rch-loader-poster.svg` file is legacy and is not used by the loader.

The global overlay reuses `PWALaunchIntro`; the route/boot animation releases once content is ready with a 4-second fail-safe.
