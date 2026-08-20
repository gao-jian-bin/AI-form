import { readBody } from 'h3'
import { renderSafeMarkdown } from '../../utils/content'
import { requireAdmin } from '../../utils/http'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ markdown?: string }>(event)
  const markdown = typeof body?.markdown === 'string' ? body.markdown.slice(0, 200_000) : ''
  return { html: renderSafeMarkdown(markdown) }
})
