/** Syntax validation does not prove ownership of a game account. */
export function normalizePlayerTag(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const tag = input.trim().toUpperCase().replace(/^#/, '');
  return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? `#${tag}` : null;
}
