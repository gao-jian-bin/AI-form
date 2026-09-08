import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createForumDatabase, ensureBaseCategories, getPublicTopic, migrateForumDatabase, recordTopicView, saveTopic } from '../server/utils/database'
import { parseTopicPayload } from '../server/utils/validation'

const input = {
  title: '浏览量测试', categorySlug: 'chatgpt', contentMarkdown: '正文',
  status: 'published' as const, tags: [], isPinned: false, externalUrl: null,
}

describe('administrator view counts', () => {
  let db: ReturnType<typeof createForumDatabase>
  beforeEach(() => {
    db = createForumDatabase(':memory:')
    migrateForumDatabase(db)
    ensureBaseCategories(db)
  })
  afterEach(() => db.close())

  it('accepts an explicit count including zero and leaves omitted counts absent', () => {
    expect(parseTopicPayload({ ...input, viewCount: 250 }).viewCount).toBe(250)
    expect(parseTopicPayload({ ...input, viewCount: 0 }).viewCount).toBe(0)
    expect(parseTopicPayload(input)).not.toHaveProperty('viewCount')
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '123', null])('rejects invalid count %s', viewCount => {
    expect(() => parseTopicPayload({ ...input, viewCount })).toThrow()
  })

  it('sets, preserves, increments and resets counts without changing the topic ID', () => {
    const topic = saveTopic(db, parseTopicPayload({ ...input, viewCount: 250 }))
    expect(topic.viewCount).toBe(250)
    recordTopicView(db, topic.id, 'visitor-a')
    const edited = saveTopic(db, { ...input, id: topic.id, title: '修改标题' })
    expect(edited.viewCount).toBe(251)
    const reset = saveTopic(db, { ...parseTopicPayload({ ...input, viewCount: 0 }), id: topic.id })
    expect(reset.viewCount).toBe(0)
    expect(reset.id).toBe(topic.id)
    recordTopicView(db, topic.id, 'visitor-b')
    expect(getPublicTopic(db, topic.id)?.viewCount).toBe(1)
  })
})
