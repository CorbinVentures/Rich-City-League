# RCH Android APK release checklist

The /app route never advertises an APK until the `RCH_ANDROID_APK_URL` environment variable points to an HTTPS .apk URL. Until a signed package is available, Android visitors get the browser's standard install experience.

## Generate a genuine APK

Use Google's Bubblewrap Trusted Web Activity tool against the existing PWA manifest:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://richcityhoops.com/manifest.webmanifest
bubblewrap build
```

Choose a stable Android application ID (for example, `com.richcityhoops.app`), compatible version info, the production website origin, and the official RCH icons.

**Important:** Create a dedicated production signing key. Back it up securely, never commit the keystore or passwords to GitHub, and keep the same key for subsequent updates. Build and test on actual Android devices before publishing.

## Verify trust / full-screen rendering

Trusted Web Activities require Android Digital Asset Links. Once the signing key exists, extract its SHA-256 certificate fingerprint using `keytool -list -v -keystore <your-keystore>`. Publish a JSON file at `https://richcityhoops.com/.well-known/assetlinks.json` with:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.richcityhoops.app",
    "sha256_cert_fingerprints": ["REPLACE_WITH_REAL_SIGNING_FINGERPRINT"]
  }
}]
```

The placeholder is **documentation only**; do not deploy it. Verify the file, package name, fingerprint, site asset associations, and signed APK before calling the app verified. Without Digital Asset Links, Android can show browser UI.

## Publish the download

1. Scan the signed release APK and install/test it on actual Android devices. Test sign-in, routing, notifications, and updates.
2. Publish the APK under an official HTTPS location (for example, a trusted RCH-owned downloads location with the correct `application/vnd.android.package-archive` content type). Prefer app-release hosting over committing large APK binaries to the Next.js repository.
3. Set **server-side** `RCH_ANDROID_APK_URL` on the Vercel production project to that verified HTTPS URL. Its path must end in `.apk`.
4. Redeploy the site. On Android, the primary /app button switches from PWA installation to **Download Android APK**.
5. Publish a signed update policy, version number, and checksum, and prepare Google Play distribution to reduce sideloading friction.

iOS **cannot** silently install a PWA from a website or automatically install an app via a configuration profile. Safari users must select Share -> Add to Home Screen -> Open as Web App -> Add, or the organization can create a separate native iOS app distributed through the App Store.
