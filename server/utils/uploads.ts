import { randomUUID } from 'node:crypto'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
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

export interface StoredUploadFile {
  path: string
  url: string
  size: number
  modifiedAt: string
}

export class UploadQuotaExceededError extends Error {
  constructor() {
    super('图片存储空间已满，请先在图片管理中删除未使用图片或调高配额')
    this.name = 'UploadQuotaExceededError'
  }
}

const UPLOAD_PATH_PATTERN = /^(\d{4})\/(0[1-9]|1[0-2])\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|jpg|gif|webp)$/i
const UPLOAD_URL_PATTERN = /\/uploads\/((\d{4})\/(0[1-9]|1[0-2])\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|jpg|gif|webp))/gi

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

export function uploadQuotaBytes(): number {
  const configuredMb = Number(process.env.UPLOAD_QUOTA_MB || 2048)
  const boundedMb = Number.isFinite(configuredMb) && configuredMb > 0
    ? Math.min(configuredMb, 1024 * 1024)
    : 2048
  return Math.floor(boundedMb * 1024 * 1024)
}

export function assertUploadCapacity(currentBytes: number, incomingBytes: number, quotaBytes: number): void {
  if (currentBytes + incomingBytes > quotaBytes) throw new UploadQuotaExceededError()
}

export async function listStoredImages(root = getUploadRoot()): Promise<StoredUploadFile[]> {
  const files: StoredUploadFile[] = []
  let years
  try {
    years = await readdir(root, { withFileTypes: true })
  }
  catch (error: any) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  for (const year of years) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue
    const yearPath = resolve(root, year.name)
    const months = await readdir(yearPath, { withFileTypes: true })
    for (const month of months) {
      if (!month.isDirectory() || !/^(0[1-9]|1[0-2])$/.test(month.name)) continue
      const monthPath = resolve(yearPath, month.name)
      const entries = await readdir(monthPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const uploadPath = `${year.name}/${month.name}/${entry.name}`
        const filePath = resolveUploadPath(root, uploadPath)
        if (!filePath) continue
        const fileStats = await stat(filePath)
        files.push({
          path: uploadPath,
          url: `/uploads/${uploadPath}`,
          size: fileStats.size,
          modifiedAt: fileStats.mtime.toISOString(),
        })
      }
    }
  }

  return files.sort((first, second) =>
    new Date(second.modifiedAt).getTime() - new Date(first.modifiedAt).getTime()
    || first.path.localeCompare(second.path))
}

export function referencedUploadPaths(markdownSources: string[]): Set<string> {
  const references = new Set<string>()
  for (const markdown of markdownSources) {
    UPLOAD_URL_PATTERN.lastIndex = 0
    for (const match of markdown.matchAll(UPLOAD_URL_PATTERN)) {
      if (match[1] && UPLOAD_PATH_PATTERN.test(match[1])) references.add(match[1])
    }
  }
  return references
}

export async function deleteStoredImage(
  root: string,
  uploadPath: string,
  references: Set<string>,
): Promise<boolean> {
  if (references.has(uploadPath)) throw new Error('图片仍被帖子引用，不能删除')
  const filePath = resolveUploadPath(root, uploadPath)
  if (!filePath) return false
  try {
    await unlink(filePath)
    return true
  }
  catch (error: any) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
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

  const storedFiles = await listStoredImages(uploadRoot)
  assertUploadCapacity(
    storedFiles.reduce((total, file) => total + file.size, 0),
    data.length,
    uploadQuotaBytes(),
  )

  await mkdir(resolve(uploadRoot, year, month), { recursive: true })
  await writeFile(filePath, data, { flag: 'wx' })

  return {
    ...imageType,
    url: `/uploads/${relativePath}`,
    alt: sanitizeImageAlt(filename),
    size: data.length,
  }
}
