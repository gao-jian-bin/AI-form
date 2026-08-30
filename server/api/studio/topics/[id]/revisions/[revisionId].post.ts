import { createError, getRouterParam } from 'h3'
import { restoreTopicRevision } from '../../../../../utils/database'
import { getForumDatabase } from '../../../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../../../utils/http'
import { withMediaReferenceLock } from '../../../../../utils/media-reference-lock'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const topicId = numericRouteId(getRouterParam(event, 'id'))
  const revisionId = numericRouteId(getRouterParam(event, 'revisionId'), '修订记录')

  try {
    const topic = await withMediaReferenceLock(() =>
      restoreTopicRevision(getForumDatabase(), topicId, revisionId))
    if (!topic) throw createError({ statusCode: 404, message: '修订记录不存在' })
    return topic
  }
  catch (error) {
    return requestError(error)
  }
})
