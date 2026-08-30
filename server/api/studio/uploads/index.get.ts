import { listTopicMarkdownSources } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requireAdmin } from '../../../utils/http'
import {
  getUploadRoot,
  listStoredImages,
  referencedUploadPaths,
  uploadQuotaBytes,
} from '../../../utils/uploads'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const references = referencedUploadPaths(listTopicMarkdownSources(getForumDatabase()))
  const files = await listStoredImages(getUploadRoot())
  return {
    items: files.map(file => ({ ...file, referenced: references.has(file.path) })),
    usedBytes: files.reduce((total, file) => total + file.size, 0),
    quotaBytes: uploadQuotaBytes(),
  }
})
