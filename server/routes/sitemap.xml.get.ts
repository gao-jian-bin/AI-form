import { setHeader } from 'h3'
import { listPublicTopics } from '../utils/database'
import { getForumDatabase } from '../utils/forum'
import { buildSitemapXml } from '../utils/seo'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
  return buildSitemapXml(siteUrl, listPublicTopics(getForumDatabase(), { limit: 100 }))
})
