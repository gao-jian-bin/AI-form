import { createError, getRouterParam } from 'h3'
import { getStudioTopic, listTopicRevisions } from '../../../../../utils/database'
import { getForumDatabase } from '../../../../../utils/forum'
import { numericRouteId, requireAdmin } from '../../../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const topicId = numericRouteId(getRouterParam(event, 'id'))
  const db = getForumDatabase()
  if (!getStudioTopic(db, topicId)) {
    throw createError({ statusCode: 404, statusMessage: '主题不存在' })
  }
  return listTopicRevisions(db, topicId)
})
