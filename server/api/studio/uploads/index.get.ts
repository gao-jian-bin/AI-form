import { listTopicMarkdownSources } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requireAdmin } from '../../../utils/http'
import {
  getUploadRoot,
  isUploadCleanupEligible,
  listStoredImages,
  referencedUploadPaths,
  uploadCleanupGraceMs,
  uploadQuotaBytes,
} from '../../../utils/uploads'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const references = referencedUploadPaths(listTopicMarkdownSources(getForumDatabase()))
  const files = await listStoredImages(getUploadRoot())
  return {
    items: files.map((file) => {
      const referenced = references.has(file.path)
      return {
        ...file,
        referenced,
        cleanupEligible: isUploadCleanupEligible(file, referenced),
      }
    }),
    usedBytes: files.reduce((total, file) => total + file.size, 0),
    quotaBytes: uploadQuotaBytes(),
    cleanupGraceHours: uploadCleanupGraceMs() / 60 / 60 / 1000,
  }
})
