interface SitemapTopic {
  id: number
  slug: string
  updatedAt: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSitemapXml(siteUrl: string, topics: SitemapTopic[]): string {
  const baseUrl = siteUrl.replace(/\/+$/, '')
  const entries = topics.map(topic => {
    const location = `${baseUrl}/t/${encodeURIComponent(topic.slug)}/${topic.id}`
    return `  <url>\n    <loc>${escapeXml(location)}</loc>\n    <lastmod>${escapeXml(topic.updatedAt)}</lastmod>\n  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}
