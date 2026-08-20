import { readBody } from 'h3'
import { saveTopic } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requestError, requireAdmin } from '../../../utils/http'
import { parseTopicPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    return saveTopic(getForumDatabase(), parseTopicPayload(await readBody(event)))
  } catch (error) {
    return requestError(error)
  }
})
