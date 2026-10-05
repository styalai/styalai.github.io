// ---------------------------------------------------------------------------
// Figure 2 -- final loss against learning rate, in Plotly.
//
// Deliberately a different library from Figure 1 on purpose: this shows how to
// mix a heavy charting library into a page that ships almost no JavaScript.
// Plotly is ~1.1 MB gzipped, which is why it is behind the same lazy loader
// as D3 rather than being imported by the component directly.
//
// Reads: markers joined by a line, log-scaled x axis (learning rates are
// geometrically spaced), hover tooltips, scroll-to-zoom on pointer devices,
// and automatic light/dark recolouring.
//
// Loaded lazily by src/scripts/lazy-charts.ts.
// ---------------------------------------------------------------------------
import rawData from '../../data/training-losses.json';
import type { TrainingLossData } from '../../lib/chart-data';
import { readChartColors, seriesColor, onThemeChange } from './theme';

const data = rawData as TrainingLossData;

/** Below this container width we tighten the layout for small screens. */
const MOBILE_BREAKPOINT = 520;

/**
 * The Plotly type surface we use.
 *
 * plotly.js-dist-min ships its own bundled types, but this bundle is loaded
 * through a dynamic import of a UMD module, so typing it precisely buys little
 * and costs a lot of casts. A small local interface keeps the call sites
 * readable and type-checked.
 */
interface PlotlyLike {
  newPlot(
    root: HTMLElement,
    data: unknown[],
    layout: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<void>;
  relayout(root: HTMLElement, update: Record<string, unknown>): Promise<void>;
  restyle(root: HTMLElement, update: Record<string, unknown>, traces?: number | number[]): Promise<void>;
  Plots: { resize(root: HTMLElement): Promise<void> };
}

export async function mount(el: HTMLElement): Promise<void> {
  el.innerHTML = '';

  // plotly.js-dist-min is a UMD bundle with no ESM entry point. Vite wraps the
  // CommonJS export in a namespace object, so `.default` holds the library.
  // The `?? mod` fallback covers bundlers that unwrap it directly.
  const namespace = (await import('plotly.js-dist-min')) as unknown as {
    default?: PlotlyLike;
  } & Partial<PlotlyLike>;
  const Plotly: PlotlyLike = (namespace.default ?? namespace) as PlotlyLike;

  const placeholder = document.createElement('div');
  placeholder.className = 'chart__placeholder';
  placeholder.textContent = 'Loading interactive chart…';
  el.append(placeholder);

  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const buildTraces = () => {
    const colors = readChartColors();
    const points = data.summary;

    return {
      // Filled markers for each learning rate.
      markers: {
        type: 'scatter',
        mode: 'markers',
        x: points.map((p) => p.lr),
        y: points.map((p) => p.finalLoss),
        text: points.map((p) => (p.unstable ? `${p.label} (unstable tail)` : p.label)),
        customdata: points.map((p) => p.bestLoss),
        marker: {
          size: 13,
          color: points.map((p) => seriesColor(colors, p.colorIndex)),
          line: { color: colors.bg, width: 2 },
        },
        hovertemplate:
          '<b>lr %{text}</b><br>final loss %{y:.3f}<br>best loss %{customdata:.3f}<extra></extra>',
        name: 'final loss',
        showlegend: false,
      },
      // A thin dashed line to guide the eye across the three runs.
      guide: {
        type: 'scatter',
        mode: 'lines',
        x: points.map((p) => p.lr),
        y: points.map((p) => p.finalLoss),
        line: { color: colors.border, width: 1.5, dash: 'dot' },
        hoverinfo: 'skip',
        showlegend: false,
      },
      // Best loss, as open markers so the gap to final loss is visible.
      best: {
        type: 'scatter',
        mode: 'markers',
        x: points.map((p) => p.lr),
        y: points.map((p) => p.bestLoss),
        text: points.map((p) => p.label),
        marker: {
          size: 9,
          symbol: 'circle-open',
          color: colors.text,
          line: { width: 1.5 },
        },
        hovertemplate: '<b>lr %{text}</b><br>best loss %{y:.3f}<extra></extra>',
        name: 'best loss',
        showlegend: false,
      },
    };
  };

  const buildLayout = () => {
    const colors = readChartColors();
    const narrow = el.clientWidth < MOBILE_BREAKPOINT;

    return {
      // Leave the page background showing through, so the figure adapts to the
      // theme without a repaint.
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: narrow
        ? { t: 12, r: 12, b: 56, l: 56 }
        : { t: 16, r: 24, b: 60, l: 62 },
      font: { family: 'inherit', size: 11, color: colors.text },
      showlegend: false,
      hovermode: 'closest',
      hoverlabel: {
        bgcolor: colors.bg,
        bordercolor: colors.border,
        font: { size: 12, color: colors.text },
      },
      xaxis: {
        type: 'log',
        title: { text: 'learning rate', font: { size: 11, color: colors.text } },
        // Pin the ticks to the learning rates we actually plotted. Without
        // this, Plotly puts every tenth between 1e-3 and 1e-2 on a log axis and
        // splits each label into a mantissa plus an exponent, which renders as
        // '9  0.001  2  3  4  5  6  7  8  9  0.01' -- technically correct and
        // completely unreadable.
        tickmode: 'array',
        tickvals: data.summary.map((p) => p.lr),
        ticktext: data.summary.map((p) => p.label),
        gridcolor: colors.grid,
        linecolor: colors.border,
        zeroline: false,
        tickfont: { size: 10, color: colors.text },
      },
      yaxis: {
        title: { text: 'final loss (nats/token)', font: { size: 11, color: colors.text } },
        gridcolor: colors.grid,
        linecolor: colors.border,
        zeroline: false,
        tickfont: { size: 10, color: colors.text },
      },
    };
  };

  const buildConfig = () => ({
    responsive: true,
    displaylogo: false,
    // Keep the modebar out of the way until it is actually needed.
    displayModeBar: false,
    // Scroll-to-zoom is great with a mouse and terrible on a phone, where it
    // hijacks vertical page scrolling. Enable it only for fine pointers.
    scrollZoom: !isCoarsePointer,
    doubleClick: isCoarsePointer ? false : ('reset+autosize' as const),
  });

  const { markers, guide, best } = buildTraces();
  await Plotly.newPlot(el, [guide, markers, best], buildLayout(), buildConfig());
  placeholder.remove();

  // ---- container resizing ------------------------------------------------
  // `responsive: true` only reacts to window resize. The figure also needs to
  // react to the container changing size (for example when a scrollbar appears
  // elsewhere on the page), so watch the element itself.
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (el.isConnected) void Plotly.Plots.resize(el);
    });
  });
  observer.observe(el);

  // ---- theme changes -----------------------------------------------------
  // Restyle rather than re-plot: relayout/re-style updates colours in place,
  // which is much cheaper and avoids the chart visibly reloading.
  onThemeChange(() => {
    if (!el.isConnected) return;
    const colors = readChartColors();
    const points = data.summary;

    void Plotly.relayout(el, {
      'paper_bgcolor': 'rgba(0,0,0,0)',
      'plot_bgcolor': 'rgba(0,0,0,0)',
      'font.color': colors.text,
      'hoverlabel.bgcolor': colors.bg,
      'hoverlabel.bordercolor': colors.border,
      'hoverlabel.font.color': colors.text,
      'xaxis.gridcolor': colors.grid,
      'xaxis.linecolor': colors.border,
      'xaxis.tickfont.color': colors.text,
      'xaxis.title.font.color': colors.text,
      'yaxis.gridcolor': colors.grid,
      'yaxis.linecolor': colors.border,
      'yaxis.tickfont.color': colors.text,
      'yaxis.title.font.color': colors.text,
    });

    // Trace 0 is the dotted guide line, 1 the markers, 2 the best-loss rings.
    void Plotly.restyle(el, { 'line.color': colors.border }, [0]);
    void Plotly.restyle(
      el,
      {
        'marker.color': points.map((p) => seriesColor(colors, p.colorIndex)),
        'marker.line.color': colors.bg,
      },
      [1],
    );
    void Plotly.restyle(el, { 'marker.color': colors.text, 'marker.line.color': colors.text }, [2]);
  });
}