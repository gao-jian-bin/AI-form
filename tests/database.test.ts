import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import {
  createCategory,
  createForumDatabase,
  createTag,
  deleteCategory,
  deleteTag,
  ensureBaseCategories,
  forumSchemaVersion,
  getStudioCategory,
  getStudioTag,
  getPublicTopic,
  getStudioTopic,
  listTopicRevisions,
  listCategories,
  listPublicTags,
  listPublicTopics,
  listStudioCategories,
  listStudioTags,
  migrateForumDatabase,
  purgeOperationalData,
  recordTopicView,
  restoreTopicRevision,
  saveTopic,
  updateCategory,
  updateTag,
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

  it('applies ordered schema migrations once and records the current version', () => {
    expect(forumSchemaVersion(db)).toBe(2)

    migrateForumDatabase(db)

    expect(forumSchemaVersion(db)).toBe(2)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'topic_revisions'").get())
      .toEqual({ name: 'topic_revisions' })
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

  it('stores the complete previous topic state before an administrator edit', () => {
    const created = saveTopic(db, {
      title: '初始标题', categorySlug: 'chatgpt', contentMarkdown: '初始正文', status: 'published',
      tags: ['Prompt', '旧标签'], isPinned: false, externalUrl: null,
      publishedAt: '2024-01-01T08:00:00.000Z',
    })

    saveTopic(db, {
      id: created.id,
      title: '修改后标题', categorySlug: 'toolbox', contentMarkdown: '修改后正文', status: 'draft',
      tags: ['新标签'], isPinned: true, externalUrl: 'https://example.com/tool',
    })

    expect(listTopicRevisions(db, created.id)).toEqual([
      expect.objectContaining({
        topicId: created.id,
        title: '初始标题',
        contentMarkdown: '初始正文',
        categorySlug: 'chatgpt',
        status: 'published',
        isPinned: false,
        externalUrl: null,
        publishedAt: '2024-01-01T08:00:00.000Z',
        tags: ['Prompt', '旧标签'],
      }),
    ])
  })

  it('restores a revision and preserves the replaced state as a new safety revision', () => {
    const created = saveTopic(db, {
      title: '版本一', categorySlug: 'chatgpt', contentMarkdown: '正文一', status: 'published',
      tags: ['一'], isPinned: false, externalUrl: null,
    })
    saveTopic(db, {
      id: created.id,
      title: '版本二', categorySlug: 'toolbox', contentMarkdown: '正文二', status: 'published',
      tags: ['二'], isPinned: true, externalUrl: null,
    })
    const revision = listTopicRevisions(db, created.id)[0]!

    const restored = restoreTopicRevision(db, created.id, revision.id)

    expect(restored).toEqual(expect.objectContaining({
      title: '版本一',
      contentMarkdown: '正文一',
      isPinned: false,
      tags: ['一'],
      category: expect.objectContaining({ slug: 'chatgpt' }),
    }))
    expect(listTopicRevisions(db, created.id)).toHaveLength(2)
    expect(listTopicRevisions(db, created.id)[0]).toEqual(expect.objectContaining({
      title: '版本二',
      tags: ['二'],
    }))
  })

  it('stores an administrator supplied publish time', () => {
    const topic = saveTopic(db, {
      title: '补录旧帖',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
      publishedAt: '2024-01-01T08:00:00.000Z',
    })

    expect(topic.publishedAt).toBe('2024-01-01T08:00:00.000Z')
  })

  it('automatically timestamps publication when no manual time is supplied', () => {
    const beforeSave = Date.now()
    const topic = saveTopic(db, {
      title: '正常发布',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
    })
    const afterSave = Date.now()
    const publishedAt = new Date(topic.publishedAt!).getTime()

    expect(publishedAt).toBeGreaterThanOrEqual(beforeSave)
    expect(publishedAt).toBeLessThanOrEqual(afterSave)
  })

  it('orders public topics by an administrator supplied publish time', () => {
    const newer = saveTopic(db, {
      title: '较新帖子',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
      publishedAt: '2024-02-01T08:00:00.000Z',
    })
    const older = saveTopic(db, {
      title: '较早帖子',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
      publishedAt: '2024-01-01T08:00:00.000Z',
    })

    expect(listPublicTopics(db, {}).map(topic => topic.id)).toEqual([newer.id, older.id])
  })

  it('rejects an administrator supplied publish time in the future', () => {
    expect(() => saveTopic(db, {
      title: '未来帖子',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: [],
      isPinned: false,
      externalUrl: null,
      publishedAt: '2999-01-01T00:00:00.000Z',
    })).toThrow('发布时间不能晚于当前时间')
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

  it('purges expired operational rows without changing aggregate topic views', () => {
    const topic = saveTopic(db, {
      title: '清理测试', categorySlug: 'chatgpt', contentMarkdown: '正文', status: 'published',
      tags: [], isPinned: false, externalUrl: null,
    })
    recordTopicView(db, topic.id, 'old-visitor', new Date('2026-06-01T00:00:00.000Z'))
    recordTopicView(db, topic.id, 'recent-visitor', new Date('2026-08-20T00:00:00.000Z'))
    db.prepare('INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)')
      .run('expired', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z')
    db.prepare('INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)')
      .run('active', '2026-08-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z')

    expect(purgeOperationalData(db, new Date('2026-08-30T00:00:00.000Z'))).toEqual({
      deletedSessions: 1,
      deletedViews: 1,
    })
    expect((db.prepare('SELECT COUNT(*) AS count FROM topic_views').get() as { count: number }).count).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS count FROM admin_sessions').get() as { count: number }).count).toBe(1)
    expect(getPublicTopic(db, topic.id)?.viewCount).toBe(2)
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

  it('lists tags used by published topics and drafts for administrators', () => {
    saveTopic(db, {
      title: '公开标签帖',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      tags: ['Prompt', '共用标签'],
      isPinned: false,
      externalUrl: null,
    })
    saveTopic(db, {
      title: '草稿标签帖',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'draft',
      tags: ['草稿标签', '共用标签'],
      isPinned: false,
      externalUrl: null,
    })
    db.prepare("INSERT INTO tags (name, slug) VALUES ('孤立标签', 'orphan')").run()

    expect(listStudioTags(db)).toEqual([
      expect.objectContaining({ name: '共用标签', topicCount: 2 }),
      expect.objectContaining({ name: '草稿标签', topicCount: 1 }),
      expect.objectContaining({ name: 'Prompt', topicCount: 1 }),
      expect.objectContaining({ name: '孤立标签', topicCount: 0 }),
    ])
  })

  it('creates, reads, renames, and deletes administrator tags without losing topic data', () => {
    const orphan = createTag(db, { name: 'AI 搜索' })
    expect(getStudioTag(db, orphan.id)).toEqual(expect.objectContaining({
      name: 'AI 搜索',
      topicCount: 0,
    }))
    expect(listStudioTags(db)).toContainEqual(expect.objectContaining({ name: 'AI 搜索' }))

    const topic = saveTopic(db, {
      title: '标签关联帖',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'draft',
      tags: ['旧标签'],
      isPinned: false,
      externalUrl: null,
    })
    const linkedTag = listStudioTags(db).find(tag => tag.name === '旧标签')!
    expect(updateTag(db, linkedTag.id, { name: '新标签' })).toEqual(expect.objectContaining({
      id: linkedTag.id,
      name: '新标签',
      topicCount: 1,
    }))
    expect(getStudioTopic(db, topic.id)?.tags).toEqual(['新标签'])

    expect(deleteTag(db, linkedTag.id)).toBe(true)
    expect(getStudioTag(db, linkedTag.id)).toBeNull()
    expect(getStudioTopic(db, topic.id)?.tags).toEqual([])
    expect(deleteTag(db, linkedTag.id)).toBe(false)
  })

  it('rejects duplicate administrator tag names case-insensitively', () => {
    const first = createTag(db, { name: 'Prompt' })
    expect(() => createTag(db, { name: 'prompt' })).toThrow('标签名称已被使用')
    const second = createTag(db, { name: '工作流' })
    expect(() => updateTag(db, second.id, { name: 'PROMPT' })).toThrow('标签名称已被使用')
    expect(getStudioTag(db, first.id)?.name).toBe('Prompt')
  })
})
