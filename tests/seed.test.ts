import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createForumDatabase, migrateForumDatabase } from '../server/utils/database'
import { seedDemoContent } from '../server/utils/seed'

describe('seedDemoContent', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createForumDatabase(':memory:')
    migrateForumDatabase(db)
  })

  afterEach(() => db.close())

  it('adds representative initial content once without duplicating it', () => {
    expect(seedDemoContent(db)).toBe(8)
    expect(seedDemoContent(db)).toBe(0)

    const totals = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) AS published,
        COUNT(CASE WHEN external_url IS NOT NULL THEN 1 END) AS tools
      FROM topics
    `).get() as { total: number; published: number; tools: number }

    expect(totals).toEqual({ total: 8, published: 7, tools: 4 })
  })
})
