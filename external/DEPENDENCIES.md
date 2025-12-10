# Vendored dependencies in `external/`

This file lists the third-party assets saved under `external/` and the version information inferred from the original CDN URLs or from local file headers (when the CDN URL did not contain an explicit version).

- **markdown-it**
  - Original CDN URL referenced in `index.html`: `https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js`
  - Version (from local file header): `14.1.0`
  - Local path: `external/markdown-it.min.js`

- **KaTeX (runtime)**
  - Original CDN URL used to download: `https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js`
  - Version (from local CSS `.katex-version`): `0.16.25`
  - Local path: `external/katex.min.js` (runtime) and `external/katex.min.css` (styles)

- **@mdit/plugin-katex (markdown-it plugin)**
  - Original CDN URL referenced in `index.html`: `https://cdn.jsdelivr.net/npm/@mdit/plugin-katex/lib/browser.js`
  - Version: not explicitly specified in the URL. The local copy was saved as `external/plugin-katex-browser.js`.
  - Note: there was also a commented example referencing `markdown-it-katex@2.0.3` in `index.html` (that is a different package/variant):
    - `https://cdn.jsdelivr.net/npm/markdown-it-katex@2.0.3/+esm`

- **highlight.js**
  - Local path: `external/highlight/highlight.min.js`
  - Version (from file header): `11.11.1`
  - The README mentions highlight.js as the upstream project (no CDN URL was embedded in `index.html`).

- **jsonurl-js**
  - Local path: `external/jsonurl.min.js`
  - Version: 1.1.8
  - Original: https://cdn.jsdelivr.net/npm/@jsonurl/jsonurl@1.1.8

Other notes
- The plugin browser bundle (`external/plugin-katex-browser.js`) imports a small companion module named like `./katex-<hash>.js`. To avoid additional remote fetches, a small adapter `external/katex-BYdhswY7.js` was added which delegates to the globally-loaded KaTeX runtime.
- If you want every dependency pinned explicitly (for example to include `@mdit/plugin-katex` exact version), I can fetch the precise package version and update this file. Right now, where the original CDN URL lacked an explicit version, this file records the URL and the local filename; the most reliable version strings were taken from file headers or the CSS where present.
