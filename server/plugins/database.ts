import { getForumDatabase } from '../utils/forum'
import { purgeOperationalData } from '../utils/database'
import { seedDemoContent } from '../utils/seed'

export default defineNitroPlugin(() => {
  const db = getForumDatabase()
  purgeOperationalData(db)
  if (process.env.SEED_DEMO_CONTENT === 'true') seedDemoContent(db)
})
