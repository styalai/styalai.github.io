// ---------------------------------------------------------------------------
// Lazy chart loader -- the "client:visible" equivalent, without a UI framework.
//
// How it works:
//
//   1. Every chart component renders an empty container carrying a
//      `data-chart="<name>"` attribute and a loading placeholder.
//   2. This module registers ONE IntersectionObserver for the whole page.
//   3. When a container first scrolls into view, we stop observing it and
//      dynamically `import()` the chart module for that name.
//
// Why bother? d3 is ~90 kB gzipped and Plotly is ~1.1 MB gzipped. Loading
// both up front would dominate the page weight of a text-only blog. Dynamic
// import() means the browser fetches them in a separate chunk, and only if
// the reader actually scrolls down to a chart.
//
// To add a chart: add an entry to LOADER below and drop the matching module in
// ./charts/. Nothing else needs to change.
// ---------------------------------------------------------------------------

/** The contract every chart module must satisfy. */
export interface ChartModule {
  /**
   * Draw the chart into `el`. Called exactly once, after the element is on
   * screen. May be async (chart libraries usually are).
   *
   * Implementations own `el`'s children -- remove any placeholder first.
   */
  mount(el: HTMLElement): void | Promise<void>;
}

type ChartLoader = () => Promise<ChartModule>;

/**
 * Registry of available charts.
 *
 * The keys must match the `data-chart` attribute in the .astro components.
 * The values are *functions* returning a dynamic import: the arrow function is
 * what keeps the library out of the main bundle until it is called.
 */
const LOADER: Record<string, ChartLoader> = {
  'd3-loss-curves': () => import('./charts/d3-loss-curves'),
  'plotly-final-loss': () => import('./charts/plotly-final-loss'),
};

/** Starts loading charts a little before they scroll in, to avoid a visible stall. */
const ROOT_MARGIN = '300px 0px';

function showError(el: HTMLElement, name: string, error: unknown) {
  console.error(`[charts] failed to load "${name}"`, error);
  el.innerHTML = `
    <p class="chart__error">
      This interactive chart could not be loaded. The written results below
      are unaffected.
    </p>`;
}

function load(el: HTMLElement, name: string) {
  const loader = LOADER[name];
  if (!loader) {
    showError(el, name, new Error(`No chart registered under "${name}". Check LOADER in src/scripts/lazy-charts.ts.`));
    return;
  }

  loader()
    .then((module) => module.mount(el))
    .catch((error: unknown) => showError(el, name, error));
}

function init() {
  const targets = document.querySelectorAll<HTMLElement>('[data-chart]');
  if (targets.length === 0) return;

  // No IntersectionObserver (very old browser, or a non-browser test
  // environment): load everything immediately rather than showing nothing.
  if (typeof IntersectionObserver === 'undefined') {
    for (const el of targets) load(el, el.dataset.chart ?? '');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        // Stop watching: a chart is only ever mounted once, so there is no
        // reason to keep the observer and its listeners alive.
        observer.unobserve(el);
        load(el, el.dataset.chart ?? '');
      }
    },
    { rootMargin: ROOT_MARGIN },
  );

  for (const el of targets) observer.observe(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}