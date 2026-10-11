# Scorebook PWA: device link handling

Main PWA: `https://richcityhoops.com`.
Separate Scorebook PWA: `https://rch-scorebook.vercel.app/`.

## Supported behavior

- Android Chrome WebAPK: plain external HTTPS links allow the operating system to dispatch the link to the installed Scorebook PWA when applicable. The Scorebook manifest also declares `launch_handler.client_mode = navigate-existing` for supported Chromium browsers (deployed independently).
- iOS/iPadOS: Safari Home Screen PWAs **cannot reliably identify or automatically route to another installed web app via ordinary HTTPS**. No user agent detection can confirm installation. The default is the normal HTTPS Scorebook URL.
- Experimental iOS workaround: the undocumented `webapp://rch-scorebook.vercel.app/` URL may open a Home Screen web app on some iOS devices, but may fail or open a **different installed web app**. It is explicitly opt-in on the Game IQ page and must be confirmed by the person after a successful device test. No auto-fallback or installed detection is claimed.
- Upon confirmation, RCH stores a per-origin local preference in its own Home Screen app's localStorage. The unified `ScorebookAppLink` component uses that preference for RCH Scorebook entries; users can revoke it on the Game IQ page.
- Never attempt this scheme automatically for visitors who have not confirmed it. Do not claim deep links into specific games work through the undocumented iOS scheme.
- A deterministic iOS app-to-app transition requires distributing a genuine native iOS package with Universal Links and an associated-domain setup, not merely an installed Safari PWA.

## Release checks

- RCH Application Quality and Vercel checks green.
- Scorebook manifest deployment ready before RCH switch.
- On a real iPhone with **both** PWAs installed, test the opt-in `webapp://` button and whether it opens the **correct** app. If it fails, explicitly choose the normal-HTTPS option.
- Test Android with Scorebook installed and not installed.
- Check Game IQ, League Center, Operations, and League Setup links.
- Existing backend scorebook access controls and data remain unchanged.
