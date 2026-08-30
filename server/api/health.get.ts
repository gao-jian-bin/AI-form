import { createError } from 'h3'
import { getForumDatabase } from '../utils/forum'

export default defineEventHandler(() => {
  try {
    getForumDatabase().prepare('SELECT 1').get()
    return { ok: true }
  }
  catch {
    throw createError({ statusCode: 503, message: 'database unavailable' })
  }
})
