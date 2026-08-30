import { createError, getRouterParam } from 'h3'
import { restoreTopicRevision } from '../../../../../utils/database'
import { getForumDatabase } from '../../../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const topicId = numericRouteId(getRouterParam(event, 'id'))
  const revisionId = numericRouteId(getRouterParam(event, 'revisionId'), '修订记录')

  try {
    const topic = restoreTopicRevision(getForumDatabase(), topicId, revisionId)
    if (!topic) throw createError({ statusCode: 404, statusMessage: '修订记录不存在' })
    return topic
  }
  catch (error) {
    return requestError(error)
  }
})
