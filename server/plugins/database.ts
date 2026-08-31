import { getForumDatabase } from '../utils/forum'
import { purgeOperationalData } from '../utils/database'
import { seedDemoContent } from '../utils/seed'

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const cleanupState = globalThis as typeof globalThis & {
  __aiForumCleanupTimer?: ReturnType<typeof setInterval>
}

export default defineNitroPlugin(() => {
  const db = getForumDatabase()
  purgeOperationalData(db)
  if (process.env.SEED_DEMO_CONTENT === 'true') seedDemoContent(db)

  if (!cleanupState.__aiForumCleanupTimer) {
    cleanupState.__aiForumCleanupTimer = setInterval(() => purgeOperationalData(db), CLEANUP_INTERVAL_MS)
    cleanupState.__aiForumCleanupTimer.unref()
  }
})
