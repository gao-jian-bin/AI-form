import { createError, getRouterParam } from 'h3'
import { getPublicTopic } from '../../utils/database'
import { renderSafeMarkdown } from '../../utils/content'
import { getForumDatabase } from '../../utils/forum'
import { numericRouteId } from '../../utils/http'

export default defineEventHandler((event) => {
  const id = numericRouteId(getRouterParam(event, 'id'))
  const topic = getPublicTopic(getForumDatabase(), id)
  if (!topic) throw createError({ statusCode: 404, statusMessage: '主题不存在' })

  return {
    ...topic,
    contentMarkdown: undefined,
    contentHtml: renderSafeMarkdown(topic.contentMarkdown),
  }
})
