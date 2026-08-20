import { resolve } from 'node:path'
import { createForumDatabase, migrateForumDatabase } from '../server/utils/database'
import { seedDemoContent } from '../server/utils/seed'

const databasePath = resolve(process.cwd(), process.env.DATABASE_PATH || '.data/ai-forum.db')
const db = createForumDatabase(databasePath)

try {
  migrateForumDatabase(db)
  const inserted = seedDemoContent(db)
  console.log(inserted ? `已写入 ${inserted} 篇演示主题。` : '数据库已有主题，未重复写入。')
} finally {
  db.close()
}
