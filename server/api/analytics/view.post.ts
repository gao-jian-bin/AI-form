import { getHeader, readBody } from 'h3'
import { normalizeAnalyticsPath } from '../../utils/analytics'
import { recordPageView } from '../../utils/database'
import { getForumDatabase } from '../../utils/forum'
import { clientAddress } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: unknown }>(event)
  const path = normalizeAnalyticsPath(body?.path)
  if (!path) return { counted: false }

  return {
    counted: recordPageView(getForumDatabase(), {
      ipAddress: clientAddress(event),
      path,
      userAgent: (getHeader(event, 'user-agent') || 'unknown').slice(0, 500),
    }),
  }
})
