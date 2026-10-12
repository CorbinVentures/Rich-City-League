# RCH Scorebook app icon (2026-10-11)

Design: monumental navy single **R** over a blue basketball scorebook and pale grid lines. This icon belongs to the separate Scorebook PWA, not the public RCH website.

- Source vector: `icon.svg` (512 viewBox, works as a crisp small favicon).
- The deployment's `public/icon.svg` and `public/manifest.webmanifest` replace the previous plain-R artwork.
- iPhone/iPad webclips also require a **PNG apple-touch icon**. Render this SVG at 180x180 and deploy it as `public/apple-touch-icon.png`, referenced by `<link rel="apple-touch-icon" ...>`.
- PWA manifest uses `/icon.svg?v=scorebook-2` with `any` and `maskable` icon purposes.
- The Scorebook Vite deployment is currently created separately from GitHub; merging a PR for these source files alone does not update its production URL.
- Apple may cache the existing Home Screen icon. Reload the installed PWA first; if the icon remains unchanged, remove and re-add the **Scorebook** Home Screen shortcut. This does not change official game data, but app-local session preferences may be affected.
