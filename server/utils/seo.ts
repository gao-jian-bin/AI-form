interface SitemapTopic {
  id: number
  slug: string
  updatedAt: string
}

interface SitemapSection {
  slug: string
}

export interface SitemapContent {
  topics: SitemapTopic[]
  categories: SitemapSection[]
  tags: SitemapSection[]
}

export interface FeedTopic {
  id: number
  slug: string
  title: string
  excerpt: string
  publishedAt: string | null
  updatedAt: string
}

export interface AtomFeedContent {
  siteName: string
  description: string
  topics: FeedTopic[]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function baseSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '')
}

function topicUrl(baseUrl: string, topic: Pick<SitemapTopic, 'id' | 'slug'>): string {
  return `${baseUrl}/t/${encodeURIComponent(topic.slug)}/${topic.id}`
}

function sitemapEntry(location: string, lastModified?: string): string {
  const lastmod = lastModified ? `\n    <lastmod>${escapeXml(lastModified)}</lastmod>` : ''
  return `  <url>\n    <loc>${escapeXml(location)}</loc>${lastmod}\n  </url>`
}

export function buildSitemapXml(siteUrl: string, content: SitemapContent): string {
  const baseUrl = baseSiteUrl(siteUrl)
  const entries = [
    sitemapEntry(`${baseUrl}/`),
    ...content.categories.map(category => sitemapEntry(`${baseUrl}/c/${encodeURIComponent(category.slug)}`)),
    ...content.tags.map(tag => sitemapEntry(`${baseUrl}/tag/${encodeURIComponent(tag.slug)}`)),
    ...content.topics.map(topic => sitemapEntry(topicUrl(baseUrl, topic), topic.updatedAt)),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
}

export function buildAtomFeedXml(siteUrl: string, content: AtomFeedContent): string {
  const baseUrl = baseSiteUrl(siteUrl)
  const feedUrl = `${baseUrl}/feed.xml`
  const updatedAt = content.topics[0]?.updatedAt || '1970-01-01T00:00:00.000Z'
  const entries = content.topics.map(topic => {
    const url = topicUrl(baseUrl, topic)
    const publishedAt = topic.publishedAt || topic.updatedAt
    return [
      '  <entry>',
      `    <id>${escapeXml(url)}</id>`,
      `    <title>${escapeXml(topic.title)}</title>`,
      `    <link href="${escapeXml(url)}" />`,
      `    <published>${escapeXml(publishedAt)}</published>`,
      `    <updated>${escapeXml(topic.updatedAt)}</updated>`,
      `    <summary type="text">${escapeXml(topic.excerpt)}</summary>`,
      '  </entry>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${escapeXml(feedUrl)}</id>`,
    `  <title>${escapeXml(content.siteName)}</title>`,
    `  <subtitle>${escapeXml(content.description)}</subtitle>`,
    `  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml" />`,
    `  <link href="${escapeXml(`${baseUrl}/`)}" />`,
    `  <updated>${escapeXml(updatedAt)}</updated>`,
    entries,
    '</feed>',
    '',
  ].filter(Boolean).join('\n')
}
