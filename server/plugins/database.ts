import { getForumDatabase } from '../utils/forum'
import { seedDemoContent } from '../utils/seed'

export default defineNitroPlugin(() => {
  const db = getForumDatabase()
  if (process.env.SEED_DEMO_CONTENT === 'true') seedDemoContent(db)
})
