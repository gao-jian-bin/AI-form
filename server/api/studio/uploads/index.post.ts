import {
  createError,
  getHeader,
  readMultipartFormData,
  setResponseStatus,
} from 'h3'
import { requireAdmin } from '../../../utils/http'
import {
  MAX_IMAGE_BYTES,
  detectImageType,
  storeUploadedImage,
} from '../../../utils/uploads'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES + 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: '单张图片不能超过 10 MB' })
  }

  const parts = await readMultipartFormData(event)
  const files = parts?.filter(part => part.name === 'file' && part.filename) || []
  if (files.length !== 1) {
    throw createError({ statusCode: 400, statusMessage: '请选择一张图片上传' })
  }

  const file = files[0]!
  if (file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '图片内容为空' })
  }
  if (file.data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '单张图片不能超过 10 MB' })
  }
  if (!detectImageType(file.data)) {
    throw createError({ statusCode: 415, statusMessage: '只支持 PNG、JPEG、WebP 或 GIF 图片' })
  }

  try {
    const storedImage = await storeUploadedImage(file.data, file.filename)
    setResponseStatus(event, 201)
    return storedImage
  } catch (error) {
    console.error(error)
    throw createError({ statusCode: 500, statusMessage: '图片保存失败，请稍后重试' })
  }
})
