// ---------------------------------------------------------------------------
// SITE IDENTITY -- edit this file to make the blog yours.
//
// Everything that is "about you" lives here: name, tagline, social links.
// You should never need to touch any other file to change these values.
//
// Note: `site` and `base` are NOT here. They live in astro.config.mjs because
// Astro's own config loader needs them before any of your code runs.
// ---------------------------------------------------------------------------

export const SITE = {
  /** Shown in the browser tab, the RSS feed, and the <title> suffix. */
  title: 'Arthur Lagacherie',

  /** Used in the header, the footer copyright, and BibTeX citations. */
  author: 'Arthur Lagacherie',

  /** Your GitHub handle. Used in the homepage heading and in citation keys. */
  handle: 'styalai',

  /**
   * One-line intro. Used three times: the <meta> description, the RSS
   * description, and the homepage intro paragraph. Keep it under ~120 chars.
   */
  description:
    'A French student working on AI. I run small experiments on language models and write about what I find.',

  /** Must match `site` in astro.config.mjs. Used to build absolute URLs. */
  url: 'https://styalai.github.io',
} as const;

/**
 * A link shown in the "Elsewhere" row on the homepage.
 *
 * Set `href` to `null` to hide a link you have not set up yet -- the row
 * simply skips it. That is better than a placeholder URL that 404s.
 */
export interface SocialLink {
  label: string;
  /** null = not configured yet, the link is hidden. */
  href: string | null;
  /** Tooltip / accessible label, when the visible text is not descriptive. */
  title?: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/styalai',
  },
  // --- TODO: paste your real URLs below to show these links ---------------
  {
    label: 'Substack',
    href: null, // e.g. 'https://you.substack.com'
  },
  {
    label: 'LessWrong',
    href: null, // e.g. 'https://lesswrong.com/user/YourName'
  },
  {
    label: 'Email',
    href: null, // e.g. 'mailto:you@example.com'
  },
];

/**
 * The links that are actually configured. Filter once here so that templates
 * never have to deal with `null`.
 */
export const ACTIVE_SOCIAL_LINKS = SOCIAL_LINKS.filter(
  (link): link is SocialLink & { href: string } => link.href !== null,
);

/** Path to the RSS feed, relative to the site root. */
export const RSS_PATH = '/rss.xml';