import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGES_PER_BATCH = 10

export type UploadImageType = {
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
  extension: 'png' | 'jpg' | 'gif' | 'webp'
}

export type StoredImage = UploadImageType & {
  url: string
  alt: string
  size: number
}

const UPLOAD_PATH_PATTERN = /^(\d{4})\/(0[1-9]|1[0-2])\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|jpg|gif|webp)$/i

function startsWithBytes(data: Uint8Array, expected: readonly number[], offset = 0): boolean {
  if (data.length < offset + expected.length) return false
  return expected.every((byte, index) => data[offset + index] === byte)
}

export function detectImageType(data: Uint8Array): UploadImageType | null {
  if (startsWithBytes(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' }
  }
  if (startsWithBytes(data, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }
  if (startsWithBytes(data, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    || startsWithBytes(data, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
    return { mimeType: 'image/gif', extension: 'gif' }
  }
  if (startsWithBytes(data, [0x52, 0x49, 0x46, 0x46])
    && startsWithBytes(data, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }
  return null
}

export function getUploadRoot(): string {
  return resolve(process.cwd(), process.env.UPLOAD_DIR?.trim() || '.data/uploads')
}

export function resolveUploadPath(root: string, uploadPath: string): string | null {
  if (!UPLOAD_PATH_PATTERN.test(uploadPath)) return null

  const candidate = resolve(root, ...uploadPath.split('/'))
  const relativePath = relative(resolve(root), candidate)
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) return null
  return candidate
}

export function sanitizeImageAlt(filename?: string): string {
  const withoutExtension = (filename || '').replace(/\.[^.]+$/, '')
  const safe = withoutExtension
    .replace(/[\r\n\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return safe || '图片'
}

export function imageMimeTypeFromPath(uploadPath: string): UploadImageType['mimeType'] | null {
  const extension = UPLOAD_PATH_PATTERN.exec(uploadPath)?.[4]?.toLowerCase()
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg') return 'image/jpeg'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'webp') return 'image/webp'
  return null
}

export async function storeUploadedImage(data: Buffer, filename?: string): Promise<StoredImage> {
  const imageType = detectImageType(data)
  if (!imageType) throw new Error('只支持 PNG、JPEG、WebP 或 GIF 图片')

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const id = randomUUID()
  const relativePath = `${year}/${month}/${id}.${imageType.extension}`
  const uploadRoot = getUploadRoot()
  const filePath = resolveUploadPath(uploadRoot, relativePath)
  if (!filePath) throw new Error('无法生成图片保存路径')

  await mkdir(resolve(uploadRoot, year, month), { recursive: true })
  await writeFile(filePath, data, { flag: 'wx' })

  return {
    ...imageType,
    url: `/uploads/${relativePath}`,
    alt: sanitizeImageAlt(filename),
    size: data.length,
  }
}
