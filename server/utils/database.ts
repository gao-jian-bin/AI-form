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

export interface ForumTag {
  id: number
  name: string
  slug: string
  topicCount: number
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

export function migrateForumDatabase(db: Database.Database): void {
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

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `)
}

export function ensureBaseCategories(db: Database.Database): void {
  const timestamp = nowIso()
  const insert = db.prepare(`
    INSERT INTO categories (name, slug, description, color, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      color = excluded.color,
      position = excluded.position,
      updated_at = excluded.updated_at
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

export function listPublicTopics(
  db: Database.Database,
  filters: { category?: string; tag?: string; query?: string; limit?: number },
): TopicRecord[] {
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
  if (filters.query?.trim()) {
    conditions.push(`(
      lower(topics.title) LIKE lower(?) OR
      lower(topics.excerpt) LIKE lower(?) OR
      lower(topics.content_markdown) LIKE lower(?)
    )`)
    const search = `%${filters.query.trim()}%`
    params.push(search, search, search)
  }

  params.push(Math.min(Math.max(filters.limit ?? 50, 1), 100))
  const rows = db.prepare(`${TOPIC_SELECT}
    WHERE ${conditions.join(' AND ')}
    ORDER BY topics.is_pinned DESC, topics.published_at DESC, topics.id DESC
    LIMIT ?
  `).all(...params) as RawTopicRow[]

  return rows.map(mapTopic)
}

export function listStudioTopics(db: Database.Database): TopicRecord[] {
  const rows = db.prepare(`${TOPIC_SELECT}
    ORDER BY topics.updated_at DESC, topics.id DESC
  `).all() as RawTopicRow[]
  return rows.map(mapTopic)
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
  const existing = input.id
    ? db.prepare('SELECT id, slug, published_at FROM topics WHERE id = ?').get(input.id) as { id: number; slug: string; published_at: string | null } | undefined
    : undefined
  if (input.id && !existing) throw new Error('主题不存在')

  const save = db.transaction(() => {
    let topicId: number
    if (existing) {
      db.prepare(`
        UPDATE topics SET
          title = ?, excerpt = ?, content_markdown = ?, category_id = ?, status = ?,
          is_pinned = ?, external_url = ?,
          published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END,
          updated_at = ?
        WHERE id = ?
      `).run(
        title,
        input.excerpt?.trim() || excerptFromMarkdown(contentMarkdown),
        contentMarkdown,
        category.id,
        input.status,
        input.isPinned ? 1 : 0,
        externalUrl,
        input.status,
        timestamp,
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
        input.excerpt?.trim() || excerptFromMarkdown(contentMarkdown),
        contentMarkdown,
        category.id,
        input.status,
        input.isPinned ? 1 : 0,
        externalUrl,
        input.status === 'published' ? timestamp : null,
        timestamp,
        timestamp,
      )
      topicId = Number(result.lastInsertRowid)
    }

    db.prepare('DELETE FROM topic_tags WHERE topic_id = ?').run(topicId)
    const insertTag = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)')
    const findTag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
    const findTagBySlug = db.prepare('SELECT id FROM tags WHERE slug = ?')
    const linkTag = db.prepare('INSERT OR IGNORE INTO topic_tags (topic_id, tag_id) VALUES (?, ?)')

    for (const rawTag of [...new Set(input.tags.map(tag => tag.trim()).filter(Boolean))]) {
      const existingTag = findTag.get(rawTag) as { id: number } | undefined
      if (!existingTag) {
        const baseSlug = slugifyTopic(rawTag)
        const slug = findTagBySlug.get(baseSlug)
          ? `${baseSlug}-${createHash('sha256').update(rawTag).digest('hex').slice(0, 8)}`
          : baseSlug
        insertTag.run(rawTag, slug)
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
