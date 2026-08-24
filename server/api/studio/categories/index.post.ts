import { readBody } from 'h3'
import { createCategory } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requestError, requireAdmin } from '../../../utils/http'
import { parseCategoryPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    return createCategory(
      getForumDatabase(),
      parseCategoryPayload(await readBody(event), 'create'),
    )
  } catch (error) {
    return requestError(error)
  }
})
