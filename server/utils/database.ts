import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { excerptFromMarkdown, slugifyTopic, validateExternalUrl } from './content'

export type TopicStatus = 'draft' | 'published'

export interface TopicInput {
  id?: number
  title: string
  slug?: string
  excerpt?: string
  categorySlug: string
  contentMarkdown: string
  status: TopicStatus
  tags: string[]
  isPinned: boolean
  externalUrl: string | null
  publishedAt?: string | null
}

export interface ForumCategory {
  id: number
  name: string
  slug: string
  description: string
  color: string
  position: number
  topicCount: number
}

export interface CategoryInput {
  name: string
  slug: string
  description: string
  color: string
  position: number
}

export type CategoryUpdateInput = Omit<CategoryInput, 'slug'>

export interface StudioCategory extends ForumCategory {
  draftTopicCount: number
  publishedTopicCount: number
}

export interface ForumTag {
  id: number
  name: string
  slug: string
  topicCount: number
}

export interface TagInput {
  name: string
}

export interface TopicRecord {
  id: number
  title: string
  slug: string
  excerpt: string
  contentMarkdown: string
  status: TopicStatus
  isPinned: boolean
  externalUrl: string | null
  viewCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  category: Pick<ForumCategory, 'id' | 'name' | 'slug' | 'color'>
  tags: string[]
}

export interface TopicRevision {
  id: number
  topicId: number
  title: string
  slug: string
  excerpt: string
  contentMarkdown: string
  categorySlug: string
  status: TopicStatus
  isPinned: boolean
  externalUrl: string | null
  publishedAt: string | null
  tags: string[]
  createdAt: string
}

export interface PublicTopicPage {
  items: TopicRecord[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PublicTopicFilters {
  category?: string
  tag?: string
  tagSlug?: string
  query?: string
}

export interface SitemapTopicMetadata {
  id: number
  slug: string
  updatedAt: string
}

export interface FeedTopicMetadata extends SitemapTopicMetadata {
  title: string
  excerpt: string
  publishedAt: string | null
}

interface RawTopicRow {
  id: number
  title: string
  slug: string
  excerpt: string
  content_markdown: string
  status: TopicStatus
  is_pinned: number
  external_url: string | null
  view_count: number
  published_at: string | null
  created_at: string
  updated_at: string
  category_id: number
  category_name: string
  category_slug: string
  category_color: string
  tag_names: string | null
}

const TOPIC_SELECT = `
  SELECT
    topics.*,
    categories.name AS category_name,
    categories.slug AS category_slug,
    categories.color AS category_color,
    (
      SELECT group_concat(tags.name, '||')
      FROM topic_tags
      JOIN tags ON tags.id = topic_tags.tag_id
      WHERE topic_tags.topic_id = topics.id
    ) AS tag_names
  FROM topics
  JOIN categories ON categories.id = topics.category_id
`

function nowIso(date = new Date()): string {
  return date.toISOString()
}

function mapTopic(row: RawTopicRow): TopicRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    status: row.status,
    isPinned: Boolean(row.is_pinned),
    externalUrl: row.external_url,
    viewCount: row.view_count,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      color: row.category_color,
    },
    tags: row.tag_names ? row.tag_names.split('||') : [],
  }
}

export function createForumDatabase(filename: string): Database.Database {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new Database(filename)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  return db
}

const FORUM_SCHEMA_VERSION = 2

interface ForumMigration {
  version: number
  up: (db: Database.Database) => void
}

const FORUM_MIGRATIONS: ForumMigration[] = [
  {
    version: 1,
    up(db) {
      db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content_markdown TEXT NOT NULL DEFAULT '',
      category_id INTEGER NOT NULL REFERENCES categories(id),
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      is_pinned INTEGER NOT NULL DEFAULT 0,
      external_url TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_topics_public
      ON topics(status, is_pinned DESC, published_at DESC);

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS topic_tags (
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (topic_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS topic_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      visitor_hash TEXT NOT NULL,
      viewed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_topic_views_visitor
      ON topic_views(topic_id, visitor_hash, viewed_at DESC);

    CREATE INDEX IF NOT EXISTS idx_topic_views_viewed_at
      ON topic_views(viewed_at);

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
      ON admin_sessions(expires_at);
      `)
    },
  },
  {
    version: 2,
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS topic_revisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          excerpt TEXT NOT NULL,
          content_markdown TEXT NOT NULL,
          category_slug TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
          is_pinned INTEGER NOT NULL,
          external_url TEXT,
          published_at TEXT,
          tags_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_topic_revisions_topic
          ON topic_revisions(topic_id, id DESC);
      `)
    },
  },
]

export function forumSchemaVersion(db: Database.Database): number {
  return Number(db.pragma('user_version', { simple: true }))
}

export function migrateForumDatabase(db: Database.Database): void {
  const currentVersion = forumSchemaVersion(db)
  if (currentVersion > FORUM_SCHEMA_VERSION) {
    throw new Error(`数据库版本 ${currentVersion} 高于程序支持的版本 ${FORUM_SCHEMA_VERSION}`)
  }

  for (const migration of FORUM_MIGRATIONS) {
    if (migration.version <= currentVersion) continue
    db.transaction(() => {
      migration.up(db)
      db.pragma(`user_version = ${migration.version}`)
    })()
  }
}

export function ensureBaseCategories(db: Database.Database): void {
  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }
  if (categoryCount.count > 0) return

  const timestamp = nowIso()
  const insert = db.prepare(`
    INSERT INTO categories (name, slug, description, color, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    insert.run('ChatGPT', 'chatgpt', 'ChatGPT 技巧、提示词、工作流与有趣玩法', '#0f9f7f', 1, timestamp, timestamp)
    insert.run('工具箱', 'toolbox', '值得收藏的在线工具与效率网站', '#d97706', 2, timestamp, timestamp)
  })
  transaction()
}

export function listCategories(db: Database.Database): ForumCategory[] {
  return db.prepare(`
    SELECT categories.id, categories.name, categories.slug, categories.description,
           categories.color, categories.position,
           COUNT(CASE WHEN topics.status = 'published' THEN 1 END) AS topic_count
    FROM categories
    LEFT JOIN topics ON topics.category_id = categories.id
    GROUP BY categories.id
    ORDER BY categories.position ASC, categories.id ASC
  `).all().map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    position: row.position,
    topicCount: row.topic_count,
  }))
}

function mapStudioCategory(row: any): StudioCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    position: row.position,
    topicCount: row.topic_count,
    draftTopicCount: row.draft_topic_count,
    publishedTopicCount: row.published_topic_count,
  }
}

const STUDIO_CATEGORY_SELECT = `
  SELECT categories.id, categories.name, categories.slug, categories.description,
         categories.color, categories.position,
         COUNT(topics.id) AS topic_count,
         COUNT(CASE WHEN topics.status = 'draft' THEN 1 END) AS draft_topic_count,
         COUNT(CASE WHEN topics.status = 'published' THEN 1 END) AS published_topic_count
  FROM categories
  LEFT JOIN topics ON topics.category_id = categories.id
`

export function listStudioCategories(db: Database.Database): StudioCategory[] {
  return db.prepare(`${STUDIO_CATEGORY_SELECT}
    GROUP BY categories.id
    ORDER BY categories.position ASC, categories.id ASC
  `).all().map(mapStudioCategory)
}

export function getStudioCategory(db: Database.Database, id: number): StudioCategory | null {
  const row = db.prepare(`${STUDIO_CATEGORY_SELECT}
    WHERE categories.id = ?
    GROUP BY categories.id
  `).get(id)
  return row ? mapStudioCategory(row) : null
}

function assertUniqueCategory(
  db: Database.Database,
  input: { name: string; slug?: string },
  exceptId?: number,
): void {
  const nameMatch = db.prepare(`
    SELECT id FROM categories
    WHERE name = ? COLLATE NOCASE AND (? IS NULL OR id != ?)
  `).get(input.name, exceptId ?? null, exceptId ?? null)
  if (nameMatch) throw new Error('板块名称已被使用')

  if (input.slug) {
    const slugMatch = db.prepare(`
      SELECT id FROM categories
      WHERE slug = ? AND (? IS NULL OR id != ?)
    `).get(input.slug, exceptId ?? null, exceptId ?? null)
    if (slugMatch) throw new Error('网址标识已被使用')
  }
}

export function createCategory(db: Database.Database, input: CategoryInput): StudioCategory {
  const timestamp = nowIso()
  const create = db.transaction(() => {
    assertUniqueCategory(db, input)
    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, color, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name.trim(),
      input.slug.trim(),
      input.description.trim(),
      input.color,
      input.position,
      timestamp,
      timestamp,
    )
    return Number(result.lastInsertRowid)
  })

  const category = getStudioCategory(db, create())
  if (!category) throw new Error('创建板块失败')
  return category
}

export function updateCategory(
  db: Database.Database,
  id: number,
  input: CategoryUpdateInput,
): StudioCategory {
  const update = db.transaction(() => {
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) throw new Error('板块不存在')
    assertUniqueCategory(db, { name: input.name.trim() }, id)
    db.prepare(`
      UPDATE categories
      SET name = ?, description = ?, color = ?, position = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.name.trim(),
      input.description.trim(),
      input.color,
      input.position,
      nowIso(),
      id,
    )
  })
  update()

  const category = getStudioCategory(db, id)
  if (!category) throw new Error('板块不存在')
  return category
}

export function deleteCategory(db: Database.Database, id: number): boolean {
  const remove = db.transaction(() => {
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) return false

    const topics = db.prepare('SELECT COUNT(*) AS count FROM topics WHERE category_id = ?').get(id) as { count: number }
    if (topics.count > 0) throw new Error('板块中还有帖子，请先移动或删除这些帖子')

    const categories = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }
    if (categories.count <= 1) throw new Error('至少保留一个板块')

    return db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0
  })
  return remove()
}

export function listPublicTags(db: Database.Database): ForumTag[] {
  const tags = db.prepare(`
    SELECT tags.id, tags.name, tags.slug, COUNT(DISTINCT topics.id) AS topic_count
    FROM tags
    JOIN topic_tags ON topic_tags.tag_id = tags.id
    JOIN topics ON topics.id = topic_tags.topic_id AND topics.status = 'published'
    GROUP BY tags.id
  `).all().map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    topicCount: row.topic_count,
  }))
  return tags.sort((a: ForumTag, b: ForumTag) =>
    b.topicCount - a.topicCount || a.name.localeCompare(b.name, 'zh-CN'))
}

export function listStudioTags(db: Database.Database): ForumTag[] {
  const tags = db.prepare(`
    SELECT tags.id, tags.name, tags.slug, COUNT(DISTINCT topics.id) AS topic_count
    FROM tags
    LEFT JOIN topic_tags ON topic_tags.tag_id = tags.id
    LEFT JOIN topics ON topics.id = topic_tags.topic_id
    GROUP BY tags.id
  `).all().map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    topicCount: row.topic_count,
  }))
  return tags.sort((a: ForumTag, b: ForumTag) =>
    b.topicCount - a.topicCount || a.name.localeCompare(b.name, 'zh-CN'))
}

export function getStudioTag(db: Database.Database, id: number): ForumTag | null {
  const row = db.prepare(`
    SELECT tags.id, tags.name, tags.slug, COUNT(DISTINCT topics.id) AS topic_count
    FROM tags
    LEFT JOIN topic_tags ON topic_tags.tag_id = tags.id
    LEFT JOIN topics ON topics.id = topic_tags.topic_id
    WHERE tags.id = ?
    GROUP BY tags.id
  `).get(id) as any
  return row
    ? { id: row.id, name: row.name, slug: row.slug, topicCount: row.topic_count }
    : null
}

function assertUniqueTag(db: Database.Database, name: string, exceptId?: number): void {
  const match = db.prepare(`
    SELECT id FROM tags
    WHERE name = ? COLLATE NOCASE AND (? IS NULL OR id != ?)
  `).get(name, exceptId ?? null, exceptId ?? null)
  if (match) throw new Error('标签名称已被使用')
}

function uniqueTagSlug(db: Database.Database, name: string): string {
  const baseSlug = slugifyTopic(name)
  const slugExists = db.prepare('SELECT 1 FROM tags WHERE slug = ?')
  if (!slugExists.get(baseSlug)) return baseSlug

  const digest = createHash('sha256').update(name).digest('hex').slice(0, 8)
  let candidate = `${baseSlug}-${digest}`
  let suffix = 2
  while (slugExists.get(candidate)) {
    candidate = `${baseSlug}-${digest}-${suffix}`
    suffix += 1
  }
  return candidate
}

export function createTag(db: Database.Database, input: TagInput): ForumTag {
  const name = input.name.trim()
  if (!name) throw new Error('标签名称不能为空')
  const id = db.transaction(() => {
    assertUniqueTag(db, name)
    const result = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)')
      .run(name, uniqueTagSlug(db, name))
    return Number(result.lastInsertRowid)
  })()
  const tag = getStudioTag(db, id)
  if (!tag) throw new Error('创建标签失败')
  return tag
}

export function updateTag(db: Database.Database, id: number, input: TagInput): ForumTag {
  const name = input.name.trim()
  if (!name) throw new Error('标签名称不能为空')
  db.transaction(() => {
    if (!db.prepare('SELECT id FROM tags WHERE id = ?').get(id)) throw new Error('标签不存在')
    assertUniqueTag(db, name, id)
    db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, id)
  })()
  const tag = getStudioTag(db, id)
  if (!tag) throw new Error('标签不存在')
  return tag
}

export function deleteTag(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM tags WHERE id = ?').run(id).changes > 0
}

function publicTopicFilter(
  filters: PublicTopicFilters,
): { conditions: string[]; params: Array<string | number> } {
  const conditions = ["topics.status = 'published'"]
  const params: Array<string | number> = []

  if (filters.category) {
    conditions.push('categories.slug = ?')
    params.push(filters.category)
  }
  if (filters.tag) {
    conditions.push(`EXISTS (
      SELECT 1 FROM topic_tags filter_topic_tags
      JOIN tags filter_tags ON filter_tags.id = filter_topic_tags.tag_id
      WHERE filter_topic_tags.topic_id = topics.id AND filter_tags.name = ? COLLATE NOCASE
    )`)
    params.push(filters.tag)
  }
  if (filters.tagSlug) {
    conditions.push(`EXISTS (
      SELECT 1 FROM topic_tags filter_topic_tags
      JOIN tags filter_tags ON filter_tags.id = filter_topic_tags.tag_id
      WHERE filter_topic_tags.topic_id = topics.id AND filter_tags.slug = ?
    )`)
    params.push(filters.tagSlug)
  }
  if (filters.query?.trim()) {
    conditions.push(`(
      lower(topics.title) LIKE lower(?) OR
      lower(topics.excerpt) LIKE lower(?) OR
      lower(topics.content_markdown) LIKE lower(?)
    )`)
    const search = `%${filters.query.trim()}%`
    params.push(search, search, search)
  }

  return { conditions, params }
}

export function listPublicTopics(
  db: Database.Database,
  filters: PublicTopicFilters & { limit?: number },
): TopicRecord[] {
  const { conditions, params } = publicTopicFilter(filters)

  params.push(Math.min(Math.max(filters.limit ?? 50, 1), 100))
  const rows = db.prepare(`${TOPIC_SELECT}
    WHERE ${conditions.join(' AND ')}
    ORDER BY topics.is_pinned DESC, topics.published_at DESC, topics.id DESC
    LIMIT ?
  `).all(...params) as RawTopicRow[]

  return rows.map(mapTopic)
}

export function listSitemapTopicMetadata(db: Database.Database): SitemapTopicMetadata[] {
  const rows = db.prepare(`
    SELECT id, slug, updated_at
    FROM topics
    WHERE status = 'published'
    ORDER BY published_at DESC, id DESC
  `).all() as Array<{ id: number; slug: string; updated_at: string }>
  return rows.map(row => ({ id: row.id, slug: row.slug, updatedAt: row.updated_at }))
}

export function listRecentFeedTopics(
  db: Database.Database,
  limit = 50,
): FeedTopicMetadata[] {
  const rows = db.prepare(`
    SELECT id, slug, title, excerpt, published_at, updated_at
    FROM topics
    WHERE status = 'published'
    ORDER BY published_at DESC, id DESC
    LIMIT ?
  `).all(Math.min(Math.max(Math.trunc(limit), 1), 100)) as Array<{
    id: number
    slug: string
    title: string
    excerpt: string
    published_at: string | null
    updated_at: string
  }>
  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }))
}

export function listPublicTopicPage(
  db: Database.Database,
  filters: PublicTopicFilters & { page?: number; pageSize?: number },
): PublicTopicPage {
  const page = Math.max(1, Math.trunc(filters.page ?? 1))
  const pageSize = Math.min(Math.max(Math.trunc(filters.pageSize ?? 30), 1), 50)
  const { conditions, params } = publicTopicFilter(filters)
  const where = conditions.join(' AND ')
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM topics
    JOIN categories ON categories.id = topics.category_id
    WHERE ${where}
  `).get(...params) as { count: number }
  const rows = db.prepare(`${TOPIC_SELECT}
    WHERE ${where}
    ORDER BY topics.is_pinned DESC, topics.published_at DESC, topics.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, (page - 1) * pageSize) as RawTopicRow[]

  return {
    items: rows.map(mapTopic),
    page,
    pageSize,
    total: count.count,
    totalPages: Math.ceil(count.count / pageSize),
  }
}

export function listStudioTopics(db: Database.Database): TopicRecord[] {
  const rows = db.prepare(`${TOPIC_SELECT}
    ORDER BY topics.updated_at DESC, topics.id DESC
  `).all() as RawTopicRow[]
  return rows.map(mapTopic)
}

export function listTopicMarkdownSources(db: Database.Database): string[] {
  return (db.prepare(`
    SELECT content_markdown FROM topics
    UNION ALL
    SELECT content_markdown FROM topic_revisions
  `).all() as Array<{ content_markdown: string }>)
    .map(row => row.content_markdown)
}

export function getPublicTopic(db: Database.Database, id: number): TopicRecord | null {
  const row = db.prepare(`${TOPIC_SELECT}
    WHERE topics.id = ? AND topics.status = 'published'
  `).get(id) as RawTopicRow | undefined
  return row ? mapTopic(row) : null
}

export function getStudioTopic(db: Database.Database, id: number): TopicRecord | null {
  const row = db.prepare(`${TOPIC_SELECT} WHERE topics.id = ?`).get(id) as RawTopicRow | undefined
  return row ? mapTopic(row) : null
}

function mapTopicRevision(row: any): TopicRevision {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(row.tags_json)
    if (Array.isArray(parsed)) tags = parsed.filter(tag => typeof tag === 'string')
  }
  catch {
    tags = []
  }

  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    categorySlug: row.category_slug,
    status: row.status,
    isPinned: Boolean(row.is_pinned),
    externalUrl: row.external_url,
    publishedAt: row.published_at,
    tags,
    createdAt: row.created_at,
  }
}

export function listTopicRevisions(
  db: Database.Database,
  topicId: number,
  limit = 50,
): TopicRevision[] {
  return (db.prepare(`
    SELECT * FROM topic_revisions
    WHERE topic_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(topicId, Math.min(Math.max(limit, 1), 100)) as any[]).map(mapTopicRevision)
}

export function getTopicRevision(
  db: Database.Database,
  topicId: number,
  revisionId: number,
): TopicRevision | null {
  const row = db.prepare(`
    SELECT * FROM topic_revisions
    WHERE topic_id = ? AND id = ?
  `).get(topicId, revisionId)
  return row ? mapTopicRevision(row) : null
}

function insertTopicRevision(
  db: Database.Database,
  topic: TopicRecord,
  createdAt: string,
): void {
  db.prepare(`
    INSERT INTO topic_revisions (
      topic_id, title, slug, excerpt, content_markdown, category_slug,
      status, is_pinned, external_url, published_at, tags_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    topic.id,
    topic.title,
    topic.slug,
    topic.excerpt,
    topic.contentMarkdown,
    topic.category.slug,
    topic.status,
    topic.isPinned ? 1 : 0,
    topic.externalUrl,
    topic.publishedAt,
    JSON.stringify(topic.tags),
    createdAt,
  )
}

function comparableTags(tags: string[]): string[] {
  return tags.map(tag => tag.toLocaleLowerCase()).sort((first, second) => first.localeCompare(second))
}

function topicWouldChange(
  topic: TopicRecord,
  next: {
    title: string
    excerpt: string
    contentMarkdown: string
    categorySlug: string
    status: TopicStatus
    isPinned: boolean
    externalUrl: string | null
    publishedAt: string | null
    tags: string[]
  },
): boolean {
  return topic.title !== next.title
    || topic.excerpt !== next.excerpt
    || topic.contentMarkdown !== next.contentMarkdown
    || topic.category.slug !== next.categorySlug
    || topic.status !== next.status
    || topic.isPinned !== next.isPinned
    || topic.externalUrl !== next.externalUrl
    || topic.publishedAt !== next.publishedAt
    || JSON.stringify(comparableTags(topic.tags)) !== JSON.stringify(comparableTags(next.tags))
}

export function saveTopic(db: Database.Database, input: TopicInput): TopicRecord {
  const title = input.title.trim()
  const contentMarkdown = input.contentMarkdown.trim()
  if (!title) throw new Error('标题不能为空')
  if (!contentMarkdown) throw new Error('正文不能为空')

  const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(input.categorySlug) as { id: number } | undefined
  if (!category) throw new Error('板块不存在')

  const externalUrl = input.externalUrl ? validateExternalUrl(input.externalUrl) : null
  if (input.externalUrl && !externalUrl) throw new Error('工具链接必须是有效的 HTTP 或 HTTPS 地址')

  const timestamp = nowIso()
  const existing = input.id ? getStudioTopic(db, input.id) || undefined : undefined
  if (input.id && !existing) throw new Error('主题不存在')

  let requestedPublishedAt: string | null = null
  if (input.publishedAt) {
    const requestedDate = new Date(input.publishedAt)
    if (Number.isNaN(requestedDate.getTime())) throw new Error('发布时间格式不正确')
    if (requestedDate.getTime() > new Date(timestamp).getTime()) {
      throw new Error('发布时间不能晚于当前时间')
    }
    requestedPublishedAt = requestedDate.toISOString()
  }
  const nextPublishedAt = input.status === 'published'
    ? requestedPublishedAt || existing?.publishedAt || timestamp
    : existing?.publishedAt || null
  const nextExcerpt = input.excerpt?.trim() || excerptFromMarkdown(contentMarkdown)
  const nextTags = [...new Set(input.tags.map(tag => tag.trim()).filter(Boolean))]
  const shouldCreateRevision = existing && topicWouldChange(existing, {
    title,
    excerpt: nextExcerpt,
    contentMarkdown,
    categorySlug: input.categorySlug,
    status: input.status,
    isPinned: input.isPinned,
    externalUrl,
    publishedAt: nextPublishedAt,
    tags: nextTags,
  })

  const save = db.transaction(() => {
    let topicId: number
    if (existing) {
      if (shouldCreateRevision) insertTopicRevision(db, existing, timestamp)
      db.prepare(`
        UPDATE topics SET
          title = ?, excerpt = ?, content_markdown = ?, category_id = ?, status = ?,
          is_pinned = ?, external_url = ?,
          published_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        title,
        nextExcerpt,
        contentMarkdown,
        category.id,
        input.status,
        input.isPinned ? 1 : 0,
        externalUrl,
        nextPublishedAt,
        timestamp,
        existing.id,
      )
      topicId = existing.id
    } else {
      const result = db.prepare(`
        INSERT INTO topics (
          title, slug, excerpt, content_markdown, category_id, status,
          is_pinned, external_url, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        slugifyTopic(input.slug || title),
        nextExcerpt,
        contentMarkdown,
        category.id,
        input.status,
        input.isPinned ? 1 : 0,
        externalUrl,
        nextPublishedAt,
        timestamp,
        timestamp,
      )
      topicId = Number(result.lastInsertRowid)
    }

    db.prepare('DELETE FROM topic_tags WHERE topic_id = ?').run(topicId)
    const findTag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
    const linkTag = db.prepare('INSERT OR IGNORE INTO topic_tags (topic_id, tag_id) VALUES (?, ?)')

    for (const rawTag of nextTags) {
      const existingTag = findTag.get(rawTag) as { id: number } | undefined
      if (!existingTag) {
        db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)')
          .run(rawTag, uniqueTagSlug(db, rawTag))
      }
      const tag = findTag.get(rawTag) as { id: number }
      linkTag.run(topicId, tag.id)
    }

    return topicId
  })

  const topicId = save()
  const topic = getStudioTopic(db, topicId)
  if (!topic) throw new Error('保存主题失败')
  return topic
}

export function restoreTopicRevision(
  db: Database.Database,
  topicId: number,
  revisionId: number,
): TopicRecord | null {
  const current = getStudioTopic(db, topicId)
  const revision = getTopicRevision(db, topicId, revisionId)
  if (!current || !revision) return null
  const revisionCategoryExists = db.prepare('SELECT 1 FROM categories WHERE slug = ?')
    .get(revision.categorySlug)

  return saveTopic(db, {
    id: topicId,
    title: revision.title,
    slug: revision.slug,
    excerpt: revision.excerpt,
    categorySlug: revisionCategoryExists ? revision.categorySlug : current.category.slug,
    contentMarkdown: revision.contentMarkdown,
    status: revision.status,
    tags: revision.tags,
    isPinned: revision.isPinned,
    externalUrl: revision.externalUrl,
    publishedAt: revision.publishedAt,
  })
}

export function deleteTopic(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM topics WHERE id = ?').run(id).changes > 0
}

export function recordTopicView(
  db: Database.Database,
  topicId: number,
  visitorHash: string,
  viewedAt = new Date(),
): boolean {
  const publicTopic = db.prepare("SELECT id FROM topics WHERE id = ? AND status = 'published'").get(topicId)
  if (!publicTopic) return false

  const cutoff = new Date(viewedAt.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const existing = db.prepare(`
    SELECT id FROM topic_views
    WHERE topic_id = ? AND visitor_hash = ? AND viewed_at >= ?
    LIMIT 1
  `).get(topicId, visitorHash, cutoff)
  if (existing) return false

  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO topic_views (topic_id, visitor_hash, viewed_at) VALUES (?, ?, ?)')
      .run(topicId, visitorHash, viewedAt.toISOString())
    db.prepare("UPDATE topics SET view_count = view_count + 1 WHERE id = ? AND status = 'published'")
      .run(topicId)
  })
  transaction()
  return true
}

export function purgeOperationalData(
  db: Database.Database,
  now = new Date(),
  viewRetentionDays = 30,
): { deletedSessions: number; deletedViews: number } {
  const viewCutoff = new Date(now.getTime() - viewRetentionDays * 24 * 60 * 60 * 1000).toISOString()
  return db.transaction(() => ({
    deletedSessions: db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?')
      .run(now.toISOString()).changes,
    deletedViews: db.prepare('DELETE FROM topic_views WHERE viewed_at < ?')
      .run(viewCutoff).changes,
  }))()
}
