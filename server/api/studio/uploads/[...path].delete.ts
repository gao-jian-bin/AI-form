import { createError, getRouterParam } from 'h3'
import { listTopicMarkdownSources } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requireAdmin } from '../../../utils/http'
import { withMediaReferenceLock } from '../../../utils/media-reference-lock'
import {
  deleteStoredImage,
  getUploadRoot,
  referencedUploadPaths,
  resolveUploadPath,
  uploadCleanupGraceMs,
} from '../../../utils/uploads'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const uploadPath = getRouterParam(event, 'path', { decode: true }) || ''
  if (!resolveUploadPath(getUploadRoot(), uploadPath)) {
    throw createError({ statusCode: 404, message: '图片不存在' })
  }

  try {
    const removed = await withMediaReferenceLock(async () => {
      const references = referencedUploadPaths(listTopicMarkdownSources(getForumDatabase()))
      return deleteStoredImage(getUploadRoot(), uploadPath, references, {
        minimumAgeMs: uploadCleanupGraceMs(),
      })
    })
    if (!removed) throw createError({ statusCode: 404, message: '图片不存在' })
    return { ok: true }
  }
  catch (error) {
    if (error instanceof Error && (
      error.message === '图片仍被帖子引用，不能删除'
      || error.message === '图片仍在暂存保护期内，暂时不能删除'
    )) {
      throw createError({ statusCode: 409, message: error.message })
    }
    throw error
  }
})
