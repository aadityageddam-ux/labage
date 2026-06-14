/** Number formatting helpers used across the UI. */

/** Round to 1 decimal place and return a string. */
export function fmt1(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '—'
}

/** Round to nearest integer. */
export function fmtInt(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toString() : '—'
}

/** Format a percentile as "Xth percentile" with correct ordinal suffix. */
export function fmtPercentile(n: number | null): string {
  if (n === null) return '—'
  const r = Math.round(n)
  const suffix =
    r % 100 >= 11 && r % 100 <= 13 ? 'th'
    : r % 10 === 1 ? 'st'
    : r % 10 === 2 ? 'nd'
    : r % 10 === 3 ? 'rd'
    : 'th'
  return `${r}${suffix}`
}

/** Return a sign-prefixed string: "+3.2" or "−3.2". */
export function fmtSigned(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n).toFixed(1)
  return n >= 0 ? `+${abs}` : `−${abs}`
}
