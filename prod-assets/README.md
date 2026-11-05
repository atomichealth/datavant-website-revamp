# Frozen production assets

The prototype pages set `<base href="https://www.datavant.com/">` and load the
theme's CSS and JS straight from production. Since the revamp went live on
2026-10-30, those files no longer match the captured markup:

- The Autoptimize bundles (`autoptimize_12c8034….css`, `autoptimize_b826d07….css`)
  return 404, so every page rendered unstyled.
- 14 theme scripts were rewritten (e.g. `logos-scroller.js`), which broke
  interactive sections such as the Trusted By logos on `before/`.

This folder holds the versions production served when the pages were captured
(datavant theme commit `f168475`, 2026-10-15; theme CSS is identical to the
10-14 commit `5e5263f`):

- `css/theme-bundle-f168475.css` — rebuilt bundle: every Zen block stylesheet,
  the Zen Blocks plugin styles, `main-nav.css`, `video-modal.css`,
  `group-bottom-line.css` and `front.css`, in WordPress enqueue order, with
  relative `url()`s pointed at www.datavant.com. Not minified.
- `wp-content/themes/datavant/…` — the 14 scripts that changed, at `f168475`.

The pages reference these with absolute `https://datavant-website-revamp.vercel.app/prod-assets/…`
URLs, because the `<base>` tag would send relative paths to www.datavant.com.
Images, fonts and the unchanged scripts still load from production.
