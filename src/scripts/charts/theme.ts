// ---------------------------------------------------------------------------
// Chart theming.
//
// Colours live in CSS custom properties in src/styles/global.css, which means
// there is exactly one source of truth for the palette. Plotly and SVG both
// need concrete colour strings though, so this module reads the resolved
// values off <html> at the moment a chart is drawn.
//
// Because it reads rather than duplicates, a theme switch is handled by
// re-running `readChartColors()` -- no JavaScript constants to keep in sync.
// ---------------------------------------------------------------------------

export interface ChartColors {
  /** One colour per chart series, in series order. */
  series: string[];
  grid: string;
  /** Axis labels and tick text. */
  text: string;
  /** Axis lines. */
  border: string;
  /** Chart background. */
  bg: string;
  isDark: boolean;
}

/** Reads a CSS custom property, falling back if it is missing or blank. */
function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return styles.getPropertyValue(name).trim() || fallback;
}

/**
 * Reads the current chart palette from the document.
 *
 * Call this every time you draw or restyle a chart -- never cache it in a
 * module-level variable, or a theme switch will leave stale colours behind.
 */
export function readChartColors(): ChartColors {
  const styles = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.dataset.theme === 'dark';

  return {
    series: [
      cssVar(styles, '--chart-1', isDark ? '#7aa2f7' : '#2563eb'),
      cssVar(styles, '--chart-2', isDark ? '#fbbf24' : '#d97706'),
      cssVar(styles, '--chart-3', isDark ? '#34d399' : '#059669'),
    ],
    grid: cssVar(styles, '--chart-grid', isDark ? '#262b34' : '#e2e5ea'),
    text: cssVar(styles, '--text-soft', isDark ? '#9aa4b2' : '#5c6572'),
    border: cssVar(styles, '--border-strong', isDark ? '#39404b' : '#cfd4db'),
    bg: cssVar(styles, '--bg', isDark ? '#0f1116' : '#ffffff'),
    isDark,
  };
}

/**
 * Subscribes to theme changes and returns an unsubscribe function.
 *
 * `ThemeToggle.astro` dispatches this event after writing the new theme to
 * localStorage, so charts can recolour without polling.
 */
export function onThemeChange(handler: (theme: string) => void): () => void {
  const listener = (event: Event) => {
    const theme = (event as CustomEvent<{ theme: string }>).detail?.theme;
    handler(theme ?? document.documentElement.dataset.theme ?? 'light');
  };
  window.addEventListener('themechange', listener);
  return () => window.removeEventListener('themechange', listener);
}

/**
 * Colours for a series, cycling through the palette if a post has more than
 * three runs. Safe to call with any index.
 */
export function seriesColor(colors: ChartColors, index: number): string {
  return colors.series[index % colors.series.length];
}