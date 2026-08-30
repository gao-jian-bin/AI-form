import { createError, getRouterParam } from 'h3'
import { listTopicMarkdownSources } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requireAdmin } from '../../../utils/http'
import {
  deleteStoredImage,
  getUploadRoot,
  referencedUploadPaths,
  resolveUploadPath,
} from '../../../utils/uploads'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const uploadPath = getRouterParam(event, 'path', { decode: true }) || ''
  if (!resolveUploadPath(getUploadRoot(), uploadPath)) {
    throw createError({ statusCode: 404, statusMessage: '图片不存在' })
  }

  const references = referencedUploadPaths(listTopicMarkdownSources(getForumDatabase()))
  try {
    const removed = await deleteStoredImage(getUploadRoot(), uploadPath, references)
    if (!removed) throw createError({ statusCode: 404, statusMessage: '图片不存在' })
    return { ok: true }
  }
  catch (error) {
    if (error instanceof Error && error.message === '图片仍被帖子引用，不能删除') {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    throw error
  }
})
