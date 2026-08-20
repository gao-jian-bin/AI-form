import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import {
  createForumDatabase,
  ensureBaseCategories,
  getPublicTopic,
  listCategories,
  listPublicTopics,
  migrateForumDatabase,
  recordTopicView,
  saveTopic,
} from '../server/utils/database'

describe('forum database', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createForumDatabase(':memory:')
    migrateForumDatabase(db)
    ensureBaseCategories(db)
  })

  afterEach(() => db.close())

  it('creates the two initial sections in navigation order', () => {
    expect(listCategories(db)).toEqual([
      expect.objectContaining({ name: 'ChatGPT', slug: 'chatgpt', position: 1 }),
      expect.objectContaining({ name: '工具箱', slug: 'toolbox', position: 2 }),
    ])
  })

  it('keeps drafts out of public lists and public detail responses', () => {
    const draft = saveTopic(db, {
      title: '尚未发布的提示词',
      categorySlug: 'chatgpt',
      contentMarkdown: '这是一份草稿。',
      status: 'draft',
      tags: ['Prompt'],
      isPinned: false,
      externalUrl: null,
    })

    expect(listPublicTopics(db, {})).toEqual([])
    expect(getPublicTopic(db, draft.id)).toBeNull()
  })

  it('filters published topics by section, tag, and search text', () => {
    saveTopic(db, {
      title: 'ChatGPT 项目提示词整理',
      categorySlug: 'chatgpt',
      contentMarkdown: '用 Markdown 保存可复用的项目提示词。',
      status: 'published',
      tags: ['Prompt', '工作流'],
      isPinned: true,
      externalUrl: null,
    })
    saveTopic(db, {
      title: 'Squoosh 图片压缩',
      categorySlug: 'toolbox',
      contentMarkdown: '浏览器端图片压缩工具。',
      status: 'published',
      tags: ['图片处理'],
      isPinned: false,
      externalUrl: 'https://squoosh.app/',
    })

    expect(listPublicTopics(db, { category: 'chatgpt' })).toHaveLength(1)
    expect(listPublicTopics(db, { tag: '图片处理' })[0]?.title).toBe('Squoosh 图片压缩')
    expect(listPublicTopics(db, { query: 'markdown' })[0]?.title).toBe('ChatGPT 项目提示词整理')
  })

  it('keeps the public topic address stable when its title changes', () => {
    const created = saveTopic(db, {
      title: '第一个标题',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
    })

    const updated = saveTopic(db, {
      id: created.id,
      title: '完全不同的标题',
      slug: '完全不同的标题',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
    })

    expect(updated.slug).toBe(created.slug)
  })

  it('counts one view per visitor and topic within a rolling day', () => {
    const topic = saveTopic(db, {
      title: '浏览量测试',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
    })
    const morning = new Date('2026-08-20T01:00:00.000Z')
    const nextDay = new Date('2026-08-21T02:00:00.000Z')

    expect(recordTopicView(db, topic.id, 'visitor-a', morning)).toBe(true)
    expect(recordTopicView(db, topic.id, 'visitor-a', morning)).toBe(false)
    expect(recordTopicView(db, topic.id, 'visitor-a', nextDay)).toBe(true)
    expect(getPublicTopic(db, topic.id)?.viewCount).toBe(2)
  })

  it('does not count views for drafts even when their numeric id is guessed', () => {
    const draft = saveTopic(db, {
      title: '私有草稿',
      categorySlug: 'chatgpt',
      contentMarkdown: '尚未发布',
      status: 'draft',
      tags: [],
      isPinned: false,
      externalUrl: null,
    })

    expect(recordTopicView(db, draft.id, 'visitor')).toBe(false)
    expect((db.prepare('SELECT view_count FROM topics WHERE id = ?').get(draft.id) as { view_count: number }).view_count).toBe(0)
  })

  it('keeps distinct tag names even when their readable slugs would collide', () => {
    const topic = saveTopic(db, {
      title: '开发语言标签',
      categorySlug: 'chatgpt',
      contentMarkdown: '比较两个名称相近的标签。',
      status: 'published',
      tags: ['C++', 'C#'],
      isPinned: false,
      externalUrl: null,
    })

    expect(topic.tags).toEqual(['C++', 'C#'])
  })
})
