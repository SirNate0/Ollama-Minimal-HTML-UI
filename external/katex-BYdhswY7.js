// Compatibility shim for the @mdit/plugin-katex browser build.
// The packaged plugin expects to import named exports `r` (render)
// and `P` (ParseError) from a local katex bundle. We provide a
// tiny adapter that delegates to the globally-loaded KaTeX (`window.katex`).

export function r(tex, options) {
  if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
    return window.katex.renderToString(tex, options);
  }
  throw new Error('KaTeX not found: please ensure `katex.min.js` is loaded before the plugin.');
}

export const P = (typeof window !== 'undefined' && window.katex && window.katex.ParseError) || Error;
