import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import {
  getRouterParam,
  sendNoContent,
  sendStream,
  setHeader,
} from 'h3'
import {
  getUploadRoot,
  imageMimeTypeFromPath,
  resolveUploadPath,
} from '../../utils/uploads'

export default defineEventHandler(async (event) => {
  const uploadPath = getRouterParam(event, 'path', { decode: true }) || ''
  const filePath = resolveUploadPath(getUploadRoot(), uploadPath)
  const mimeType = imageMimeTypeFromPath(uploadPath)
  if (!filePath || !mimeType) {
    return sendNoContent(event, 404)
  }

  let fileSize = 0
  try {
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) throw new Error('not a file')
    fileSize = fileStats.size
  } catch {
    return sendNoContent(event, 404)
  }

  setHeader(event, 'content-type', mimeType)
  setHeader(event, 'content-length', fileSize)
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  setHeader(event, 'x-content-type-options', 'nosniff')
  await sendStream(event, createReadStream(filePath))
})
