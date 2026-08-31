const PUBLIC_PAGE_PATTERNS = [
  /^\/$/,
  /^\/c\/[^/]+\/?$/,
  /^\/tag\/[^/]+\/?$/,
  /^\/t\/[^/]+\/\d+\/?$/,
  /^\/search\/?$/,
]

export function normalizeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const rawPath = value.trim()
  if (!rawPath.startsWith('/') || rawPath.startsWith('//') || rawPath.length > 1000) return null

  let pathname: string
  try {
    pathname = new URL(rawPath, 'http://forum.local').pathname
  }
  catch {
    return null
  }

  if (pathname.length > 500 || !PUBLIC_PAGE_PATTERNS.some(pattern => pattern.test(pathname))) return null
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}
