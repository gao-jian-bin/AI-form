import { setHeader } from 'h3'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /studio\nDisallow: /api/studio\nSitemap: ${siteUrl}/sitemap.xml\n`
})
