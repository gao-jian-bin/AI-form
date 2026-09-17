import { getQuery } from 'h3'
import { listPublicTopicPage } from '../../utils/database'
import { getForumDatabase } from '../../utils/forum'
import { requestError } from '../../utils/http'
import { parsePublicTopicQuery } from '../../utils/validation'

export default defineEventHandler((event) => {
  try {
    const page = listPublicTopicPage(getForumDatabase(), parsePublicTopicQuery(getQuery(event)))

    return {
      ...page,
      items: page.items.map(({ contentMarkdown: _content, viewCount: _views, ...topic }) => topic),
    }
  }
  catch (error) {
    return requestError(error)
  }
})
