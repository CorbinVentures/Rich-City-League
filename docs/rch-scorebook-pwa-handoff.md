# Scorebook PWA: device link handling

Main PWA: `https://richcityhoops.com`.
Separate Scorebook PWA: `https://rch-scorebook.vercel.app/`.

## Supported behavior

- **Android Chromium / installed WebAPK:** use a normal external HTTPS Scorebook URL; Android may hand off to an installed PWA when supported and configured by the operating system. The Scorebook manifest declares `launch_handler.client_mode = navigate-existing` for browsers that support it, but this does not guarantee link handling in every Android browser.
- **iOS / iPadOS Home Screen PWAs:** links outside the PWA's scope open in a browser view. Ordinary HTTPS links do not automatically open another installed Home Screen PWA. Apple does not provide a supported installed-PWA detection and cross-app launch API.
- **Verified failure:** an experiment using the undocumented `webapp://` scheme produced the alert “Safari cannot open the page because the address is invalid” on a real iPhone with both RCH and Scorebook installed (2026-10-11).
- **Fix:** `ScorebookAppLink` only emits valid `https://rch-scorebook.vercel.app/` URLs. When tapped inside an installed RCH iPhone app, it explains that the user must switch to the separate Scorebook Home Screen icon to get its installed full-screen experience, or can open the valid website in a Safari view. It removes prior experimental launch-preference keys.
- Never reintroduce the unverified custom URL scheme or a misleading “Open installed PWA” button. Do not confuse `launch_handler` (handling within a launched web app on supported browsers) with a universal app-to-app launcher.
- **True iOS one-tap app handoff:** requires a native iOS app or wrapper that implements Universal Links and associated domains. The separate Safari Home Screen PWA alone cannot deliver that behavior.

## Release checks

- RCH Application Quality and Vercel checks green.
- Regression: all Scorebook button anchors use the valid HTTPS origin; the failed custom scheme is not rendered in the UI.
- Test iPhone in installed RCH PWA: Scorebook link shows accurate launch guidance; website button opens valid link; close button dismisses it without navigating.
- Test Android with Scorebook installed and not installed.
- Check Game IQ, League Center, Operations, and League Setup links.
- Existing backend scorebook access controls and official data remain unchanged.

Official Apple reference: https://developer.apple.com/videos/play/wwdc2023/10120/
