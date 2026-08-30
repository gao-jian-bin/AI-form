import { setHeader } from 'h3'
import { listCategories, listPublicTags, listSitemapTopicMetadata } from '../utils/database'
import { getForumDatabase } from '../utils/forum'
import { buildSitemapXml } from '../utils/seo'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
  const db = getForumDatabase()
  return buildSitemapXml(siteUrl, {
    topics: listSitemapTopicMetadata(db),
    categories: listCategories(db),
    tags: listPublicTags(db),
  })
})
