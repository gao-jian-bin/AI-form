import { getQuery } from 'h3'
import { listPublicTopics } from '../../utils/database'
import { getForumDatabase } from '../../utils/forum'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const topics = listPublicTopics(getForumDatabase(), {
    category: typeof query.category === 'string' ? query.category : undefined,
    tag: typeof query.tag === 'string' ? query.tag : undefined,
    query: typeof query.q === 'string' ? query.q : undefined,
    limit: 60,
  })

  return topics.map(({ contentMarkdown: _content, ...topic }) => topic)
})
