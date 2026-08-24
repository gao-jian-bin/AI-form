import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import {
  createCategory,
  createForumDatabase,
  deleteCategory,
  ensureBaseCategories,
  getStudioCategory,
  getPublicTopic,
  listCategories,
  listPublicTags,
  listPublicTopics,
  listStudioCategories,
  migrateForumDatabase,
  recordTopicView,
  saveTopic,
  updateCategory,
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

  it('does not overwrite administrator changes when defaults are ensured again', () => {
    const chatgpt = listCategories(db).find(category => category.slug === 'chatgpt')!
    updateCategory(db, chatgpt.id, {
      name: 'ChatGPT 实战',
      description: '管理员修改后的说明',
      color: '#2563eb',
      position: 8,
    })

    ensureBaseCategories(db)

    expect(getStudioCategory(db, chatgpt.id)).toEqual(expect.objectContaining({
      name: 'ChatGPT 实战',
      description: '管理员修改后的说明',
      color: '#2563eb',
      position: 8,
    }))
  })

  it('creates, reads, updates, and orders administrator categories', () => {
    const created = createCategory(db, {
      name: 'AI 绘画',
      slug: 'ai-image',
      description: '绘画工具与学习资源',
      color: '#7c3aed',
      position: 3,
    })

    expect(getStudioCategory(db, created.id)).toEqual(expect.objectContaining({
      name: 'AI 绘画',
      slug: 'ai-image',
      topicCount: 0,
      draftTopicCount: 0,
      publishedTopicCount: 0,
    }))

    const updated = updateCategory(db, created.id, {
      name: 'AI 图像',
      description: '图像生成与处理',
      color: '#2563eb',
      position: 0,
    })

    expect(updated).toEqual(expect.objectContaining({
      name: 'AI 图像',
      slug: 'ai-image',
      color: '#2563eb',
      position: 0,
    }))
    expect(listStudioCategories(db)[0]?.slug).toBe('ai-image')
  })

  it('rejects duplicate category slugs and names', () => {
    expect(() => createCategory(db, {
      name: '另一个 ChatGPT',
      slug: 'chatgpt',
      description: '',
      color: '#111111',
      position: 3,
    })).toThrow('网址标识已被使用')

    expect(() => createCategory(db, {
      name: 'ChatGPT',
      slug: 'chatgpt-copy',
      description: '',
      color: '#111111',
      position: 3,
    })).toThrow('板块名称已被使用')
  })

  it('counts drafts and published topics for category administrators', () => {
    saveTopic(db, {
      title: '板块草稿', categorySlug: 'chatgpt', contentMarkdown: '正文', status: 'draft',
      tags: [], isPinned: false, externalUrl: null,
    })
    saveTopic(db, {
      title: '板块公开帖', categorySlug: 'chatgpt', contentMarkdown: '正文', status: 'published',
      tags: [], isPinned: false, externalUrl: null,
    })

    expect(listStudioCategories(db).find(category => category.slug === 'chatgpt')).toEqual(
      expect.objectContaining({ topicCount: 2, draftTopicCount: 1, publishedTopicCount: 1 }),
    )
    expect(listCategories(db).find(category => category.slug === 'chatgpt')?.topicCount).toBe(1)
  })

  it.each([
    ['draft', '仍有草稿'],
    ['published', '仍有公开帖子'],
  ] as const)('refuses to delete a category containing a %s topic', (status, title) => {
    const category = createCategory(db, {
      name: `不可删除-${status}`,
      slug: `protected-${status}`,
      description: '',
      color: '#334155',
      position: 5,
    })
    saveTopic(db, {
      title, categorySlug: category.slug, contentMarkdown: '正文', status,
      tags: [], isPinned: false, externalUrl: null,
    })

    expect(() => deleteCategory(db, category.id)).toThrow('板块中还有帖子，请先移动或删除这些帖子')
  })

  it('deletes an empty category but keeps at least one category', () => {
    const empty = createCategory(db, {
      name: '临时板块', slug: 'temporary', description: '', color: '#64748b', position: 9,
    })
    expect(deleteCategory(db, empty.id)).toBe(true)
    expect(getStudioCategory(db, empty.id)).toBeNull()

    const categories = listStudioCategories(db)
    expect(deleteCategory(db, categories[1]!.id)).toBe(true)
    expect(() => deleteCategory(db, categories[0]!.id)).toThrow('至少保留一个板块')
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

  it('lists every published tag independently from the active topic filter', () => {
    saveTopic(db, {
      title: '公开帖子一',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: ['Prompt', '工作流'],
      isPinned: false,
      externalUrl: null,
    })
    saveTopic(db, {
      title: '公开帖子二',
      categorySlug: 'toolbox',
      contentMarkdown: '正文',
      status: 'published',
      tags: ['Prompt', '图片处理'],
      isPinned: false,
      externalUrl: null,
    })
    saveTopic(db, {
      title: '私有草稿',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'draft',
      tags: ['不应公开'],
      isPinned: false,
      externalUrl: null,
    })

    expect(listPublicTags(db)).toEqual([
      expect.objectContaining({ name: 'Prompt', topicCount: 2 }),
      expect.objectContaining({ name: '工作流', topicCount: 1 }),
      expect.objectContaining({ name: '图片处理', topicCount: 1 }),
    ])
  })
})
