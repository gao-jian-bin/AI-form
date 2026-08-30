import { readBody } from 'h3'
import { saveTopic } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requestError, requireAdmin } from '../../../utils/http'
import { withMediaReferenceLock } from '../../../utils/media-reference-lock'
import { parseTopicPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    const input = parseTopicPayload(await readBody(event))
    return await withMediaReferenceLock(() => saveTopic(getForumDatabase(), input))
  } catch (error) {
    return requestError(error)
  }
})
