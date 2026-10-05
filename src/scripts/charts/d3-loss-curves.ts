// ---------------------------------------------------------------------------
// Figure 1 -- training loss curves for three learning rates, in D3.
//
// Features: hover tooltips, a legend that toggles lines on and off, smooth
// transitions when the y-axis rescales, automatic light/dark recolouring, and
// responsive layout from phone to desktop.
//
// Data comes from a bundled JSON import rather than fetch() on purpose: Vite
// inlines it at build time, so there is no runtime URL to get wrong when the
// site is served from a subpath on GitHub Pages.
//
// This module is loaded lazily by src/scripts/lazy-charts.ts, which is why
// nothing here runs until the chart is scrolled into view.
// ---------------------------------------------------------------------------
import * as d3 from 'd3';
import rawData from '../../data/training-losses.json';
import type { LossPoint, LossSeries, TrainingLossData } from '../../lib/chart-data';
import { readChartColors, seriesColor, onThemeChange } from './theme';

const data = rawData as TrainingLossData;

/** Below this container width we tighten the layout for small screens. */
const MOBILE_BREAKPOINT = 520;

/** Milliseconds for y-axis rescales triggered by the legend. */
const TRANSITION_MS = 380;

export function mount(el: HTMLElement): void {
  // ---- state -------------------------------------------------------------
  // Which curves are shown. Mutating this is what the legend buttons do.
  const visible: boolean[] = data.series.map(() => true);

  // ---- clear the placeholder --------------------------------------------
  el.innerHTML = '';

  // ---- build the DOM once, then only update attributes on redraw ---------
  el.append(buildLegend());

  const tooltip = buildTooltip(el);
  const svg = d3
    .select(el)
    .append('svg')
    .attr('class', 'chart__svg')
    .attr('role', 'img')
    .attr(
      'aria-label',
      'Line chart of training loss against optimiser step for three learning rates. The same numbers are given in the table below the figure.',
    );

  const layers = {
    grid: svg.append('g').attr('class', 'grid'),
    xAxis: svg.append('g').attr('class', 'axis axis--x'),
    yAxis: svg.append('g').attr('class', 'axis axis--y'),
    xLabel: svg.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle'),
    yLabel: svg.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle'),
    curves: svg.append('g').attr('class', 'curves'),
    hover: svg.append('g').attr('class', 'hover').style('display', 'none'),
    overlay: svg.append('rect').attr('class', 'overlay').attr('fill', 'transparent'),
  };

  // One hover dot per series, created up front and shown/hidden as needed.
  const hoverDots = data.series.map((series) =>
    layers.hover
      .append('circle')
      .attr('class', 'hover-dot')
      .attr('r', 4)
      .attr('fill', seriesColor(readChartColors(), series.colorIndex)),
  );

  const crosshair = layers.hover
    .append('line')
    .attr('class', 'crosshair')
    .attr('y1', 0)
    .attr('y2', 0);

  // ---- scales ------------------------------------------------------------
  // Reassigned on every draw, then read by the interaction handlers below.
  let xScale = d3.scaleLinear();
  let yScale = d3.scaleLinear();
  let innerWidth = 0;
  let innerHeight = 0;

  function domainForVisibleSeries(): [number, number] {
    const shown = data.series.filter((_, i) => visible[i]);
    const source = shown.length > 0 ? shown : data.series;
    const values = source.flatMap((s) => s.points.map((p) => p.loss));
    const [lo, hi] = d3.extent(values) as [number, number];
    // Pad by 5% so the extremes do not touch the frame.
    const pad = (hi - lo) * 0.05 || 0.1;
    return [lo - pad, hi + pad];
  }

  /**
   * @param animate  Pass false for first paint and for resize, where a
   *                  transition would look like a glitch rather than polish.
   */
  function draw(animate: boolean) {
    const width = el.clientWidth || 680;
    const isNarrow = width < MOBILE_BREAKPOINT;

    // Short and wide on a phone; taller on desktop so three curves separate.
    const height = isNarrow ? 250 : 320;

    // Tighter margins on narrow screens so the plot area stays usable.
    const margin = isNarrow
      ? { top: 12, right: 12, bottom: 36, left: 44 }
      : { top: 14, right: 20, bottom: 42, left: 52 };

    innerWidth = Math.max(10, width - margin.left - margin.right);
    innerHeight = Math.max(10, height - margin.top - margin.bottom);

    const maxStep = d3.max(data.series, (s) => d3.max(s.points, (p) => p.step)) ?? 0;

    xScale = d3.scaleLinear().domain([0, maxStep]).range([0, innerWidth]);
    yScale = d3.scaleLinear().domain(domainForVisibleSeries()).nice().range([innerHeight, 0]);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
    svg.select('g.grid').attr('transform', `translate(${margin.left},${margin.top})`);
    layers.curves.attr('transform', `translate(${margin.left},${margin.top})`);
    layers.hover.attr('transform', `translate(${margin.left},${margin.top})`);

    // --- gridlines + axes -------------------------------------------------
    const yTicks = yScale.ticks(isNarrow ? 4 : 6);
    layers.grid.call(d3.axisLeft(yScale).tickValues(yTicks).tickSize(-innerWidth).tickFormat(() => ''));

    layers.xAxis
      .attr('transform', `translate(${margin.left},${margin.top + innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(isNarrow ? 4 : 7).tickSizeOuter(0));
    layers.yAxis.attr('transform', `translate(${margin.left},${margin.top})`).call(
      d3.axisLeft(yScale).tickValues(yTicks).tickSize(0).tickPadding(8).tickFormat((v) => Number(v).toFixed(1)),
    );

    layers.xLabel
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 6)
      .text('optimiser step');
    layers.yLabel
      .attr('transform', `translate(${isNarrow ? 12 : 14},${margin.top + innerHeight / 2}) rotate(-90)`)
      .text('training loss (nats/token)');

    // --- curves -----------------------------------------------------------
    // A line generator takes an iterable of points, but the datum bound to each
    // path is a whole series. So build the generator here -- it closes over the
    // scales assigned just above -- and hand D3 a small function that maps a
    // series to its path string. `d3.line` accepts only one type parameter, so
    // this wrapper is what keeps the two types straight.
    const pathFor = d3
      .line<LossPoint>()
      .x((p) => xScale(p.step))
      .y((p) => yScale(p.loss))
      .curve(d3.curveMonotoneX);

    const line = (series: LossSeries): string => pathFor(series.points) ?? '';

    const colors = readChartColors();

    const curves = layers.curves
      .selectAll<SVGPathElement, LossSeries>('path.curve')
      .data(data.series, (s) => s.label);

    curves.exit().remove();

    curves
      .enter()
      .append('path')
      .attr('class', 'curve')
      // Hidden curves keep a faint ghost so you can still tell they exist.
      .attr('stroke-opacity', (_, i) => (visible[i] ? 1 : 0.12))
      .attr('d', line)
      .merge(curves)
      .attr('stroke', (s) => seriesColor(colors, s.colorIndex))
      .call((sel) => {
        if (animate) {
          // Smooth transition: the y-axis rescales under the reader's cursor
          // while the toggled line fades in or out.
          sel
            .transition()
            .duration(TRANSITION_MS)
            .ease(d3.easeCubicOut)
            .attr('d', line)
            .attr('opacity', (_, i) => (visible[i] ? 1 : 0))
            .attr('stroke-opacity', (_, i) => (visible[i] ? 1 : 0.12));
        } else {
          sel.attr('d', line).attr('opacity', (_, i) => (visible[i] ? 1 : 0)).attr('stroke-opacity', (_, i) => (visible[i] ? 1 : 0.12));
        }
      });

    // --- hover layer ------------------------------------------------------
    layers.overlay
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    // Tooltip rows must follow the legend's visibility.
    data.series.forEach((_, i) => {
      tooltip.rows[i].hidden = !visible[i];
    });

    hideTooltip();
  }

  // ---- legend ------------------------------------------------------------
  function buildLegend(): HTMLElement {
    const legend = document.createElement('div');
    legend.className = 'chart__legend';
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', 'Toggle learning rate curves');

    data.series.forEach((series, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'legend-item';
      button.setAttribute('aria-pressed', 'true');
      button.style.setProperty('--legend-color', seriesColor(readChartColors(), series.colorIndex));

      const swatch = document.createElement('span');
      swatch.className = 'legend-item__swatch';
      const label = document.createElement('span');
      label.textContent = series.label;

      button.append(swatch, label);
      button.addEventListener('click', () => {
        visible[index] = !visible[index];
        button.setAttribute('aria-pressed', String(visible[index]));
        // Animate: the y-axis rescales and the toggled line fades in or out.
        draw(true);
      });

      legend.append(button);
    });

    return legend;
  }

  // ---- tooltip -----------------------------------------------------------
  function buildTooltip(host: HTMLElement) {
    const node = document.createElement('div');
    node.className = 'chart__tooltip';
    node.dataset.visible = 'false';
    // Charts are decorative here; the numbers are all in the prose and table,
    // so keep the tooltip out of the accessibility tree to avoid noise.
    node.setAttribute('aria-hidden', 'true');

    const title = document.createElement('div');
    title.className = 'chart__tooltip-title';
    node.append(title);

    const rows = data.series.map((series) => {
      const row = document.createElement('div');
      row.className = 'chart__tooltip-row';

      const swatch = document.createElement('span');
      swatch.className = 'chart__tooltip-swatch';
      swatch.style.backgroundColor = seriesColor(readChartColors(), series.colorIndex);

      const name = document.createElement('span');
      name.textContent = `lr ${series.label}`;

      const value = document.createElement('span');
      value.className = 'chart__tooltip-value';

      row.append(swatch, name, value);
      node.append(row);
      return row;
    });

    host.append(node);
    return { node, title, rows };
  }

  function hideTooltip() {
    tooltip.node.dataset.visible = 'false';
    layers.hover.style('display', 'none');
  }

  function showTooltipAt(pointerX: number, pointerY: number) {
    const color = readChartColors();

    // Nearest recorded step. A linear scan is clearer than bisecting here, and
    // it stays correct even if a future dataset has non-uniform steps.
    const localX = pointerX - Number(layers.overlay.attr('x'));
    const targetStep = xScale.invert(Math.max(0, Math.min(innerWidth, localX)));
    const steps = data.series[0].points;
    const stepIndex = steps.reduce(
      (best, point, index) =>
        Math.abs(point.step - targetStep) < Math.abs(steps[best].step - targetStep) ? index : best,
      0,
    );

    const step = data.series[0].points[stepIndex].step;

    // Draw the crosshair and one dot per visible curve at that step.
    const x = xScale(step);
    crosshair.attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', innerHeight);
    layers.hover.style('display', null);

    data.series.forEach((series, index) => {
      const point = series.points[stepIndex];
      const dot = hoverDots[index];
      if (!point || !visible[index]) {
        dot.attr('r', 0);
        return;
      }
      dot.attr('r', 4).attr('cx', xScale(point.step)).attr('cy', yScale(point.loss));
      tooltip.rows[index].hidden = false;
      tooltip.rows[index].querySelector<HTMLElement>('.chart__tooltip-value')!.textContent = point.loss.toFixed(3);
      tooltip.rows[index].querySelector<HTMLElement>('.chart__tooltip-swatch')!.style.backgroundColor =
        seriesColor(color, series.colorIndex);
    });

    // Position the tooltip next to the pointer, kept inside the container so it
    // never gets clipped on a narrow screen.
    tooltip.title.textContent = `step ${step}`;
    tooltip.node.dataset.visible = 'true';

    const box = tooltip.node.getBoundingClientRect();
    const hostWidth = el.clientWidth;
    const gap = 14;
    const left = Math.max(2, Math.min(pointerX + gap, hostWidth - box.width - 2));
    const top = Math.max(2, Math.min(pointerY - box.height / 2, el.clientHeight - box.height - 2));
    tooltip.node.style.left = `${left}px`;
    tooltip.node.style.top = `${top}px`;
  }

  // ---- interaction -------------------------------------------------------
  // `pointermove` covers mouse, pen and touch-drag in one handler. Combined
  // with `touch-action: pan-y` on .chart in global.css, this means a vertical
  // swipe still scrolls the page while a horizontal drag reads the chart.
  layers.overlay
    .on('pointermove', (event: PointerEvent) => {
      const [px, py] = d3.pointer(event, svg.node());
      showTooltipAt(px, py);
    })
    .on('pointerleave', hideTooltip)
    .on('pointerdown', (event: PointerEvent) => {
      const [px, py] = d3.pointer(event, svg.node());
      showTooltipAt(px, py);
    });

  // ---- resizing ----------------------------------------------------------
  // Debounce to one redraw per animation frame, and never animate: re-running a
  // 380 ms transition on every pixel of a window drag looks broken.
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (el.isConnected) draw(false);
    });
  });
  observer.observe(el);

  // ---- theme changes -----------------------------------------------------
  onThemeChange(() => {
    if (!el.isConnected) return;
    const colors = readChartColors();
    svg
      .selectAll<SVGPathElement, LossSeries>('path.curve')
      .attr('stroke', (s) => seriesColor(colors, s.colorIndex));
    data.series.forEach((series, index) => {
      hoverDots[index].attr('fill', seriesColor(colors, series.colorIndex));
      tooltip.rows[index].querySelector<HTMLElement>('.chart__tooltip-swatch')!.style.backgroundColor =
        seriesColor(colors, series.colorIndex);
    });
    legendSwatches(colors);
  });

  function legendSwatches(colors: ReturnType<typeof readChartColors>) {
    el.querySelectorAll<HTMLElement>('.legend-item').forEach((button, index) => {
      const series = data.series[index];
      if (series) button.style.setProperty('--legend-color', seriesColor(colors, series.colorIndex));
    });
  }

  // ---- first paint -------------------------------------------------------
  // Render without animation, then fade the strokes in on the next frame.
  draw(false);
  layers.curves
    .selectAll<SVGPathElement, LossSeries>('path.curve')
    .attr('stroke-opacity', 0)
    .transition()
    .duration(TRANSITION_MS)
    .attr('stroke-opacity', (_, i) => (visible[i] ? 1 : 0.12));
}