# aiblog

A minimal personal research blog: plain Astro, plain CSS, one font stack, and
almost no JavaScript. Posts are Markdown with math and syntax highlighting;
charts are the only heavy thing, and they load only when you scroll to them.

Deployed to GitHub Pages at <https://styalai.github.io>.

---

## Running it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install     # installs dependencies (uses the committed package-lock.json)
npm run dev     # starts the dev server at http://localhost:4321
```

The dev server hot-reloads: edit a post or a component and the browser updates
without a refresh.

The other scripts:

| Command           | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                              |
| `npm run build`   | Builds the static site into `dist/`                     |
| `npm run preview` | Serves the built `dist/` locally, to check the real thing |
| `npm run check`   | Type-checks every `.astro` and `.ts` file               |
| `npm run data`    | Regenerates the sample post's synthetic dataset         |

Run `npm run check` before pushing. It catches the most common mistake in a
content-collection site: a post whose frontmatter does not match the schema in
`src/content.config.ts`.

---

## Making it yours

**One file:** [`src/consts.ts`](src/consts.ts) holds your name, your one-line
intro, and your social links. It is the only file you need to edit for identity.

The "Elsewhere" links on the homepage are listed there with `href: null` for the
ones you have not set up yet. A `null` link is hidden. Fill in the real URL and it
appears on the next build — no placeholder 404 links.

**Fonts:** the site uses a system font stack that prefers Inter if you have it
installed locally (see `--font-sans` in `src/styles/global.css`). There is no
webfont request, so there is no layout shift. To self-host Inter instead, drop
the `.woff2` files in `public/fonts/`, add an `@font-face` block at the top of
`global.css`, and put `Inter` first in `--font-sans`.

---

## Adding a post

Create a file in `src/content/blog/`. The extension `.md` or `.mdx` both work.
The filename becomes the URL: `notes-on-runs.md` is served at `/blog/notes-on-runs/`.

```markdown
---
title: 'A title, used in the homepage list and the browser tab'
description: 'One or two sentences. Used for search results and the RSS feed.'
date: 2026-10-06
tags: ['optimization', 'training']
---

Your text goes here.
```

Then `npm run dev` and look at <http://localhost:4321>. The post, its entry on
the homepage, and its RSS item all appear automatically.

**Frontmatter fields** are defined in [`src/content.config.ts`](src/content.config.ts).
Only `title`, `description`, and `date` are required. Everything else is
optional:

| Field         | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `tags`        | Chips under the post title                                     |
| `updatedDate` | Shows an "Updated ..." line; also tells search engines          |
| `author`      | Overrides `SITE.author` — for guest posts                       |
| `draft: true` | Excluded from the homepage, RSS, and sitemap while you work     |
| `doi`         | If set, the "Cite this post" block emits a proper `@article`   |
| `arxiv`       | Same, and adds an `eprint` field                                |

If you add a field to the frontmatter but not to the schema, the build fails
with a message naming the field. That is intentional.

### Writing with math

Inline math uses single dollars, display math double:

```markdown
The loss is $\mathcal{L}(\theta)$, defined as

$$
\mathcal{L}(\theta) = -\frac{1}{N}\sum_i y_i \log \hat{p}_\theta(x_i)
$$
```

Rendered by KaTeX. Styles come from `katex/dist/katex.min.css`, imported in
[`src/components/BaseHead.astro`](src/components/BaseHead.astro) — bundled from
`node_modules` at build time, not from a CDN.

### Writing in MDX

Use `.mdx` when a post needs a component. MDX is JSX, so two things bite:

- Comments must be `{/* like this */}`, **not** `// like this`. MDX parses a
  `//` line as markup and will fail to build.
- Do not put a literal `*/` inside a comment, or it ends the comment early.

### Figures and captions

`components/Figure.astro` wraps any content with a numbered caption. Both chart
components use it, so if you write your own figure you get the same numbering
style:

```mdx
import Figure from '../../components/Figure.astro';

<Figure n={1} caption="A short caption that stands on its own.">
  <img src="/img/thing.png" alt="Described for screen readers" />
</Figure>
```

Figure numbers are **manual**. Astro renders pages concurrently at build time,
so an automatic counter would not reliably match reading order. If you insert a
figure, bump the numbers of the ones after it.

---

## Adding a chart

Charts are the only JavaScript on this site, and the design rule is that a chart
must never cost a reader anything unless they look at it. d3 is ~90 kB gzipped
and Plotly is ~1.1 MB gzipped, so both sit behind a single `IntersectionObserver`
and are fetched only when scrolled into view.

### 1. Write the chart module

Create `src/scripts/charts/my-chart.ts`. It must export a `mount` function that
draws into the element it is given, and it should remove any placeholder first:

```ts
import * as d3 from 'd3';
import myData from '../../data/my-data.json';
import { readChartColors, seriesColor, onThemeChange } from './theme';

export function mount(el: HTMLElement) {
  el.innerHTML = ''; // drop the placeholder

  // Read colours from CSS variables so light/dark needs no duplicated palette.
  const colors = readChartColors();

  // Redraw when the reader flips the theme.
  onThemeChange(() => {
    if (el.isConnected) draw();
  });

  function draw() {
    // ... build the chart ...
  }

  draw();
}
```

`mount` may be `async` — use that if you need to `await import()` a library
yourself.

Two helpers in `theme.ts` are worth knowing:

- `readChartColors()` returns the resolved values of `--chart-1/2/3`,
  `--chart-grid`, `--text-soft`, `--border-strong` and `--bg`. Call it every time
  you draw, never cache it, or a theme switch leaves stale colours behind.
- `onThemeChange(handler)` subscribes to the `themechange` event that the toggle
  dispatches, and returns an unsubscribe function.

### 2. Register it

Add one line to the `LOADER` map in
[`src/scripts/lazy-charts.ts`](src/scripts/lazy-charts.ts):

```ts
const LOADER: Record<string, ChartLoader> = {
  'd3-loss-curves': () => import('./charts/d3-loss-curves'),
  'plotly-final-loss': () => import('./charts/plotly-final-loss'),
  'my-chart': () => import('./charts/my-chart'), // <- new
};
```

### 3. Wrap it in a component

Create `src/components/charts/MyChart.astro`:

```astro
---
import Figure from '../Figure.astro';
interface Props { n: number; caption: string }
const { n, caption } = Astro.props;
---

<Figure n={n} caption={caption} flush>
  {/* The key here must match LOADER above. */}
  <div class="chart" data-chart="my-chart">
    <div class="chart__placeholder">Loading interactive chart…</div>
  </div>
</Figure>

<script>
  import '../../scripts/lazy-charts';
</script>
```

Note the import path is relative to the component (`components/charts/` →
`../../scripts/`). Astro bundles and deduplicates `<script>` tags, so importing
the loader in every chart component is correct, not redundant.

### 4. Use it in a post

```mdx
import MyChart from '../../components/charts/MyChart.astro';

<MyChart n={1} caption="What the reader should take away." />
```

### If you need a new library

```bash
npm install my-library
```

Always from npm, never from a CDN. A CDN script tag means your readers hit a
third party on every page view, and it breaks offline and under a strict CSP.
If the library is large, keep the `await import()` inside `mount` so it stays in
its own chunk.

---

## Deploying to GitHub Pages

The workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
already exists. It is one-time setup plus pushing.

**One-time, in the GitHub UI** (not in the repo):

1. Push this repo to GitHub as `styalai.github.io` (see below if you picked a
   different name).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Save.

**Then, every time:**

```bash
git add -A
git commit -m "new post"
git push origin main
```

That runs the workflow: it installs with `npm ci`, builds, and publishes to
<https://styalai.github.io>. You can also trigger it by hand from the
**Actions** tab → *Deploy to GitHub Pages* → **Run workflow**.

### If the repo is not named `styalai.github.io`

`base` in [`astro.config.mjs`](astro.config.mjs) must include the repo name, or
every internal link 404s:

```js
site: 'https://styalai.github.io',
base: '/my-repo-name', // '/' if the repo is styalai.github.io
```

`site` and `base` live in `astro.config.mjs`, not in the workflow —
`withastro/action` reads them from there. Do not also set them in the workflow;
there is no such input.

To create the repo and push:

```bash
git init -b main                      # only if this is not already a repo
git add -A
git commit -m "initial commit"
gh repo create styalai.github.io --public --source=. --push
```

---

## Project layout

```
.github/workflows/deploy.yml   GitHub Pages deployment
astro.config.mjs                site, base, integrations, KaTeX + Shiki setup
public/favicon.svg              site icon

src/
  consts.ts                     <- your name, intro, links. Start here.
  content.config.ts             blog collection: frontmatter schema
  styles/global.css             the whole design: tokens, theme, prose, charts

  lib/
    urls.ts                     base-path-aware URL helper (withBase)
    dates.ts                    date formatting, pinned to UTC
    readingTime.ts              reading-time estimate from post body
    bibtex.ts                   BibTeX generation for the citation block
    chart-data.ts               TypeScript types for the chart dataset

  components/
    BaseHead.astro              <head>: meta, theme bootstrap, KaTeX CSS
    ThemeToggle.astro           light/dark toggle + themechange event
    SiteHeader.astro            name + toggle (name hidden on the homepage)
    SiteFooter.astro            copyright + "built with Astro"
    Toc.astro                   table of contents from Astro's heading outline
    Figure.astro                numbered figure caption
    CiteThis.astro              BibTeX / plain citation block with copy button
    charts/
      D3LossCurves.astro        figure 1: loss curves
      PlotlyFinalLoss.astro     figure 2: final vs best loss

  scripts/
    lazy-charts.ts              the single IntersectionObserver + loader registry
    charts/
      d3-loss-curves.ts         D3 chart implementation
      plotly-final-loss.ts      Plotly chart implementation
      theme.ts                  shared colour reading + theme subscription

  data/
    training-losses.json        chart data, bundled at build time
    make-training-losses.mjs    regenerates it (`npm run data`)

  layouts/
    BaseLayout.astro            <html> shell
    BlogPost.astro              post header, TOC, prose, citation block

  pages/
    index.astro                 homepage
    blog/[...slug].astro        one page per post
    rss.xml.ts                  RSS feed
    404.astro

  content/blog/
    first-experiment.mdx        the sample post
```

---

## Things that will trip you up

These are real Astro 7 behaviours that cost time to rediscover. Each one is
already handled in this project.

**1. `Astro.base` no longer exists.** It was removed from the component context
and is now a type error. Use `import.meta.env.BASE_URL`, or the
[`withBase()` helper](src/lib/urls.ts) which every internal link in this project
goes through:

```astro
<a href={withBase('/blog/some-post/')}>Some post</a>
```

Hard-coding `/` works until you rename the repo, at which point every internal
link breaks at once.

**2. KaTeX needs `unified()` in the config.** Astro 7 renders Markdown with a
built-in engine that does **not** run remark/rehype plugins, so `remark-math` and
`rehype-katex` would silently do nothing and your math would appear as raw
`$...$` text. [`astro.config.mjs`](astro.config.mjs) opts back in:

```js
import { unified } from '@astrojs/markdown-remark';

markdown: {
  processor: unified({
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  }),
},
```

Note the plugin lists go *inside* `unified({...})`. The older
`markdown.remarkPlugins` still works but prints a deprecation warning.

**3. `z` comes from `astro/zod`.** In older Astro it was imported from
`astro:content`. See `src/content.config.ts`.

**4. Whitespace between inline elements is stripped.** Astro 7 defaults to
`compressHTML: 'jsx'`, which removes the newline between two inline elements.
`<span>Figure {n}.</span>\n{caption}` renders as "Figure 1.Training loss". Use
an explicit `{' '}`:

```astro
<span>Figure {n}.</span>{' '}{caption}
```

**5. `getCollection()` order is not guaranteed.** Always `.sort()` by date.
Without it, post order can change between builds.

**6. TypeScript is pinned to `^5` on purpose.** `typescript@7` is the new native
port and is not yet reliably supported by `astro check`. Leave the pin until
`astro check` supports it, then bump it in `package.json`.

---

## Credits

Built with [Astro](https://astro.build), [KaTeX](https://katex.org),
[d3](https://d3js.org), and [Plotly](https://plotly.com/javascript/). Syntax
highlighting by [Shiki](https://shiki.style).

The sample post's data is **synthetic** — generated by
`src/data/make-training-losses.mjs`, not measured from a training run. The post
says so in its own opening paragraph.