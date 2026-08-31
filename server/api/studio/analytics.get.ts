import { getQuery } from 'h3'
import { getAnalyticsReport, type AnalyticsSort } from '../../utils/database'
import { getForumDatabase } from '../../utils/forum'
import { requireAdmin } from '../../utils/http'

const ALLOWED_DAYS = new Set([1, 7, 30, 90])

export default defineEventHandler((event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const requestedDays = Number(query.days)
  const days = (ALLOWED_DAYS.has(requestedDays) ? requestedDays : 7) as 1 | 7 | 30 | 90
  const sort: AnalyticsSort = query.sort === 'views' ? 'views' : 'latest'

  return getAnalyticsReport(getForumDatabase(), {
    days,
    sort,
    query: typeof query.query === 'string' ? query.query : '',
  })
})
