import { readBody } from 'h3'
import { createTag } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requestError, requireAdmin } from '../../../utils/http'
import { parseTagPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    return createTag(getForumDatabase(), parseTagPayload(await readBody(event)))
  } catch (error) {
    return requestError(error)
  }
})
