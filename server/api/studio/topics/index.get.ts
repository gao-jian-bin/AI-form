import { listStudioTopics } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  return listStudioTopics(getForumDatabase())
})
