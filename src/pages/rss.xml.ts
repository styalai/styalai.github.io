/**
 * RSS feed, served at /rss.xml.
 *
 * Astro's convention: any file in src/pages/ whose name ends in `.xml.ts`
 * becomes an endpoint that exports a GET function.
 *
 * Note: this is a plain .ts module, so it has no `---` frontmatter fence.
 */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context: { site: URL | undefined }) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    // Falls back to SITE.url if `site` is missing from astro.config.mjs.
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      // Must match the URL that blog/[...slug].astro generates.
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}