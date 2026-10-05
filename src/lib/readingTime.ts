// ---------------------------------------------------------------------------
// Reading time estimation.
//
// Content collections expose each entry's raw Markdown source as `entry.body`
// (this is documented Astro API, not an internal field). We measure that
// instead of the rendered HTML, which is both simpler and more accurate:
// counting HTML tags would inflate the word count with class names.
// ---------------------------------------------------------------------------
import readingTime from 'reading-time';

/**
 * Returns a short, human-readable label such as "4 min read".
 *
 * Rounded up and floored at 1 minute, so a very short post never reads as
 * "0 min read".
 */
export function estimateReadingTime(body: string | undefined): string {
  if (!body) return '1 min read';

  const { minutes } = readingTime(body);
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} min read`;
}

/** The numeric estimate on its own -- useful if you want to style it separately. */
export function estimateReadingMinutes(body: string | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.round(readingTime(body).minutes));
}