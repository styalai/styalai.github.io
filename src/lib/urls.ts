// ---------------------------------------------------------------------------
// Base-path-aware URL helpers.
//
// IMPORTANT (Astro 7): `Astro.base` no longer exists. Astro removed it from the
// component context, so `Astro.base` is now a type error. The supported
// replacement is `import.meta.env.BASE_URL`, which Astro defines statically
// from the `base` option in astro.config.mjs.
//
// Why bother with a helper at all? Because getting `base` wrong is the single
// most common way to break a GitHub Pages deploy:
//
//   base: '/'    -> a user site,  styalai.github.io/blog/post/
//   base: '/x'   -> a project site, styalai.github.io/x/blog/post/
//
// Hard-coding '/' in a link works until you rename your repo, at which point
// every internal link 404s. Routing every internal link through withBase() means
// a single `base` change in astro.config.mjs fixes the whole site.
//
// `import.meta.env.BASE_URL` is replaced with a literal at build time, so this
// adds no runtime cost.
// ---------------------------------------------------------------------------

/** The configured base path: '/' for a user site, '/repo' for a project site. */
export const BASE = import.meta.env.BASE_URL;

/**
 * Prefixes a site-root-relative path with the configured `base`.
 *
 *   withBase('/')            -> '/'      (or '/repo' for a project site)
 *   withBase('/blog/post/')  -> '/blog/post/'
 *   withBase('favicon.svg')  -> '/favicon.svg'
 */
export function withBase(path: string): string {
  // Normalise: drop the trailing slash Astro includes, so we never emit '//'.
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}` || '/';
}