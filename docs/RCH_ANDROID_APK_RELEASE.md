# Rich City Hoops Android APK: free release operations

## What is already automated

- **App identity:** `com.richcityhoops.app`, product name **Rich City Hoops**, launch URL `https://richcityhoops.com/social?source=android`.
- **Web ownership:** `https://richcityhoops.com/.well-known/assetlinks.json` includes the SHA-256 fingerprint for the RCH production release signing certificate.
- **Free builds:** GitHub Actions `Build RCH Android APK` uses Bubblewrap and the public repository's free standard runners.
- **Free hosting:** The manual release job publishes `RCH-Android.apk` and a SHA-256 checksum to the public repository's GitHub Releases.
- **Auto-display:** The site `/app` page detects a published `android-v*` GitHub Release with exactly the `RCH-Android.apk` asset and then shows **Download Android APK**. Until it exists, Android visitors get the existing web-app install fallback.
- **Validation:** Pull requests touching this configuration build an **unsigned** APK artifact. This is for CI only, NOT an installable or releasable package.

## One-time owner action: KEEP THE SIGNING KEY

The production signing certificate has already been generated separately from the source code. The owner must download the **private backup** provided in the ChatGPT delivery and store it securely in two locations under their control. Do not put its contents into Git, commit history, public issues, PRs, or screenshots.

The private backup contains:
- `rch-android-release.p12`: encrypted PKCS12 keystore, alias `rch_release`.
- `SIGNING-KEY-BACKUP.txt`: keystore password, package ID, and public certificate fingerprint.
- `GITHUB-SECRET-RCH_ANDROID_KEYSTORE_BASE64.txt`: pasteable base64 form of the encrypted keystore.

In GitHub, open this repository → **Settings → Secrets and variables → Actions → New repository secret**. Create exactly:

1. `RCH_ANDROID_KEYSTORE_BASE64`: the **entire one-line contents** of `GITHUB-SECRET-RCH_ANDROID_KEYSTORE_BASE64.txt`.
2. `RCH_ANDROID_KEYSTORE_PASSWORD`: the password shown in `SIGNING-KEY-BACKUP.txt`.

Do NOT paste either secret into chat. The GitHub workflow uses the same password for the keystore and key. The workflow checks that the signing certificate matches the published Digital Asset Links fingerprint before it can release.

## First signed release

1. Check that the deployment containing `/.well-known/assetlinks.json` is live. Its certificate must match:
   `C8:8E:3D:2C:D3:4E:85:04:31:60:C4:70:51:CD:4D:4E:20:84:39:B7:F2:AA:90:23:74:FA:C6:EA:07:BF:18:6E`.
2. In GitHub **Actions → Build RCH Android APK → Run workflow** (select the `main` branch). The job generates a signed APK using the secure Actions secrets, uploads it as a temporary Actions artifact, and publishes a free GitHub Release.
3. Verify the release contains `RCH-Android.apk` plus `RCH-Android.apk.sha256`. Run a malware scan; verify SHA-256, certificate and package ID. Test on an actual Android device **before sharing the link publicly**. Check login, routing, back navigation, notifications and whether the app launches without browser chrome. Browser UI instead of full-screen usually means Digital Asset Links verification failed.
4. Once the release is published, allow up to 5 minutes for `richcityhoops.com/app` to detect the APK automatically. If it takes longer, refresh; check GitHub release state and the Vercel deployment. Do not use an unsigned test artifact as a public download.

## Future updates

Do not lose or rotate the signing key casually. New APK builds need the **same keystore** to be accepted as an update on existing devices. The workflow generates a rising Android version code for each run. A new manually triggered workflow creates a new GitHub Release and becomes the latest download. Plan upgrades and migration to Google Play before making the app widely available.

## Costs and alternatives

- Bubblewrap is open source and does not charge a packaging fee.
- Public repositories use GitHub's standard Actions runners without billed minutes; release asset hosting has no bandwidth limit, subject to GitHub's terms and abuse limits.
- Direct APK sideloading has friction: users must explicitly approve downloads/installation from their browser and may see Android security warnings. It is **not** silent installation.
- Optional Google Play distribution has a one-time $25 developer-account registration fee. iPhone installation is a different platform and cannot be automated by a website.

## Security

Never commit `android.keystore`, `.p12` or the plaintext secret files to this public repository. The build workflow only reconstructs the keystore in its short-lived signing job. Its GitHub release contains signed binaries and checksums, never private keys or passwords. If the signing backup is lost, existing installations cannot be updated with a different key.
