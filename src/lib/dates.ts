// ---------------------------------------------------------------------------
// Date formatting helpers.
//
// All dates are formatted in UTC on purpose. A post dated `2026-01-01` parsed
// by JavaScript can land on 31 December in a negative UTC offset, which would
// make the homepage list disagree with the post page. Pinning to UTC keeps
// every reader on every timezone seeing the same date.
// ---------------------------------------------------------------------------

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const fullDate = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** e.g. "March 2026" -- used in the homepage "Writing" list. */
export const formatMonthYear = (date: Date): string => monthYear.format(date);

/** e.g. "1 March 2026" -- used in the post header. */
export const formatDate = (date: Date): string => fullDate.format(date);

/** e.g. "2026-03-01" -- used for <time datetime="..."> machine-readable values. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);