import { resolve } from 'node:path'
import type Database from 'better-sqlite3'
import { createForumDatabase, ensureBaseCategories, migrateForumDatabase } from './database'

const globalForum = globalThis as typeof globalThis & {
  __aiForumDatabase?: Database.Database
}

export function getForumDatabase(): Database.Database {
  if (!globalForum.__aiForumDatabase) {
    const filename = resolve(process.cwd(), process.env.DATABASE_PATH || '.data/ai-forum.db')
    const db = createForumDatabase(filename)
    migrateForumDatabase(db)
    ensureBaseCategories(db)
    globalForum.__aiForumDatabase = db
  }

  return globalForum.__aiForumDatabase
}
