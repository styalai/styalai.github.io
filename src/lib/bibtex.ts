// ---------------------------------------------------------------------------
// BibTeX generation for the "Cite this post" block at the bottom of each post.
//
// The entry type is chosen honestly from the frontmatter:
//   - no doi / arxiv  -> @misc   (a blog post; claiming @article would be a lie)
//   - arxiv only      -> @article with journal = "arXiv preprint arXiv:..."
//   - doi present     -> @article with the DOI filled in
//
// To upgrade an entry, just add `arxiv:` or `doi:` to the post's frontmatter.
// ---------------------------------------------------------------------------

export interface CiteInput {
  title: string;
  date: Date;
  /** Absolute URL of the post, including the `base` path prefix. */
  url: string;
  /** Falls back to SITE.author at the call site. */
  author: string;
  /** e.g. "2301.00001" */
  arxiv?: string | undefined;
  /** e.g. "10.1000/xyz123" */
  doi?: string | undefined;
}

/**
 * Builds a citation key like `lagacherie2026learning`.
 *
 * BibTeX keys must be unique-ish and contain no spaces, so we take the last
 * word of the author name, the year, and the first significant word of the
 * title. Plain ASCII only, because accented characters in keys are a
 * portability trap across reference managers.
 */
function buildCiteKey(author: string, date: Date, title: string): string {
  const lastName =
    author
      .trim()
      .split(/\s+/)
      .pop()
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip combining accents
      .replace(/[^a-zA-Z]/g, '') || 'anon';

  const firstWord =
    title
      .split(/\s+/)
      .find((w) => w.length > 3 && /[a-zA-Z]/.test(w))
      ?.toLowerCase()
      .replace(/[^a-z]/g, '') || 'post';

  return `${lastName.toLowerCase()}${date.getUTCFullYear()}${firstWord}`;
}

/** Wraps a value in braces so BibTeX treats it as literal text (keeps capitals). */
const brace = (value: string): string => `{${value}}`;

/** Escapes the three characters that are special inside a BibTeX field. */
function escapeField(value: string): string {
  return value.replace(/([{}])/g, '\\$1').replace(/~/g, '\\~{}');
}

export function toBibtex(input: CiteInput): string {
  const { title, date, url, author, arxiv, doi } = input;
  const year = date.getUTCFullYear();
  const key = buildCiteKey(author, date, title);

  // @misc is the honest default: this is a web page, not a journal article.
  if (!arxiv && !doi) {
    return [
      `@misc{${key},`,
      `  author       = ${brace(escapeField(author))},`,
      `  title        = ${brace(escapeField(title))},`,
      `  year         = ${brace(String(year))},`,
      `  howpublished = {\\url{${url}}},`,
      `  note         = {Blog post}`,
      `}`,
    ].join('\n');
  }

  const fields = [
    `  author  = ${brace(escapeField(author))},`,
    `  title   = ${brace(escapeField(title))},`,
    `  year    = ${brace(String(year))},`,
    `  journal = ${brace(escapeField(arxiv ? `arXiv preprint arXiv:${arxiv}` : 'Preprint'))},`,
  ];

  if (doi) fields.push(`  doi     = ${brace(escapeField(doi))},`);
  if (arxiv) fields.push(`  eprint  = ${brace(escapeField(arxiv))},`);
  if (!doi) fields.push(`  url     = ${brace(escapeField(url))},`);

  return [`@article{${key},`, ...fields, `}`].join('\n');
}

/**
 * A plain-text citation, for people who would rather paste prose than BibTeX.
 * Shown next to the BibTeX block with a second copy button.
 */
export function toPlainCitation(input: CiteInput): string {
  const { author, title, date, url } = input;
  const monthYear = date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${author} (${date.getUTCFullYear()}). "${title}". ${monthYear}. ${url}`;
}