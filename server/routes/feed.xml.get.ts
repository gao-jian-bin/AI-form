import { setHeader } from 'h3'
import { listAllPublicTopics } from '../utils/database'
import { getForumDatabase } from '../utils/forum'
import { buildAtomFeedXml } from '../utils/seo'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/atom+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  const config = useRuntimeConfig(event)
  return buildAtomFeedXml(process.env.SITE_URL || 'http://localhost:3000', {
    siteName: String(config.public.siteName || 'AI 知识论坛'),
    description: String(config.public.siteDescription || 'ChatGPT 方法和实用工具。'),
    topics: listAllPublicTopics(getForumDatabase()),
  })
})
