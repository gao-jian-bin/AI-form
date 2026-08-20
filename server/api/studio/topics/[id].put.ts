import { getRouterParam, readBody } from 'h3'
import { saveTopic } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../utils/http'
import { parseTopicPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    const input = parseTopicPayload(await readBody(event))
    return saveTopic(getForumDatabase(), {
      ...input,
      id: numericRouteId(getRouterParam(event, 'id')),
    })
  } catch (error) {
    return requestError(error)
  }
})
