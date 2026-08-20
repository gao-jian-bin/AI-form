import { getRouterParam } from 'h3'
import { recordTopicView } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, visitorFingerprint } from '../../../utils/http'

export default defineEventHandler((event) => {
  const id = numericRouteId(getRouterParam(event, 'id'))
  return { counted: recordTopicView(getForumDatabase(), id, visitorFingerprint(event)) }
})
