// ---------------------------------------------------------------------------
// The blog content collection.
//
// Astro reads this file at build time, validates every post's frontmatter
// against the schema below, and makes the posts available to any page via
// `getCollection('blog')`.
//
// If you add a field to `schema`, you can then use it in your frontmatter.
// If you forget to add it here, the build fails with a clear error -- that is
// the whole point of this file.
// ---------------------------------------------------------------------------
import { defineCollection } from 'astro:content';
// NOTE: in Astro 7, `z` (Zod) lives in 'astro/zod', not 'astro:content'.
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // Loads every .md and .mdx file under src/content/blog.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    /** Post title. Used in <title>, the homepage list, and the RSS feed. */
    title: z.string(),

    /** One or two sentences. Used for <meta description> and the RSS feed. */
    description: z.string(),

    /** Publication date. Any ISO format works; it is parsed into a Date. */
    date: z.coerce.date(),

    /** Set if you revise a post later. Renders a "Updated ..." line. */
    updatedDate: z.coerce.date().optional(),

    /** Free-form labels, e.g. ['training', 'optimization']. Default: none. */
    tags: z.array(z.string()).default([]),

    /**
     * Citation author. Defaults to SITE.author when omitted, which is what
     * you want almost always. Override only for guest posts.
     */
    author: z.string().optional(),

    /** Set true to keep a post out of the homepage, RSS, and sitemap. */
    draft: z.boolean().default(false),

    // --- Optional citation metadata ---------------------------------------
    // If you set any of these, the "Cite this post" block below each post
    // produces a richer BibTeX entry (a proper @article instead of @misc).
    doi: z.string().optional(),
    arxiv: z.string().optional(),
  }),
});

export const collections = { blog };