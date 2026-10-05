// ---------------------------------------------------------------------------
// Astro configuration.
//
// SITE-WIDE SETTINGS: `site` and `base` below must match your GitHub repo.
// See README.md -> "Deploying to GitHub Pages" if you ever rename the repo.
// ---------------------------------------------------------------------------
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// IMPORTANT: `unified` comes from the separate `@astrojs/markdown-remark`
// package. Astro 7 renders Markdown with its own built-in engine (called
// "Saetteri") which does NOT run remark/rehype plugins. Opting back into
// `unified()` is what makes KaTeX work. If you delete this line, the math in
// your posts renders as raw `$...$` text.
import { unified } from '@astrojs/markdown-remark';

// remark-math turns `$inline$` and `$$display$$` into math nodes...
import remarkMath from 'remark-math';
// ...and rehype-katex turns those nodes into KaTeX HTML.
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  // The full URL of your site, with no trailing slash. GitHub Pages serves
  // project repos at https://<user>.github.io/<repo>/, so `base` below must
  // include the repo name unless the repo is <user>.github.io itself.
  site: 'https://styalai.github.io',
  base: '/',

  integrations: [
    mdx(), // lets .mdx posts import and use Astro components
    sitemap(), // generates /sitemap-index.xml using `site` above
  ],

  markdown: {
    // Required for remark/rehype plugins (KaTeX) -- see note at the top.
    // In Astro 7 the plugin lists are passed into `unified({...})` rather than
    // set as top-level markdown options; the older `markdown.remarkPlugins`
    // style still works but is deprecated and prints a warning.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      // Light + dark code themes. Astro emits CSS variables for both and sets
      // no colors of its own (defaultColor: false); the swap is handled by the
      // rules in src/styles/global.css.
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      wrap: true, // wrap long lines instead of scrolling horizontally
    },
  },
});