import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assertUploadCapacity,
  deleteStoredImage,
  detectImageType,
  listStoredImages,
  referencedUploadPaths,
  resolveUploadPath,
  sanitizeImageAlt,
} from '../server/utils/uploads'

describe('image uploads', () => {
  let uploadRoot: string

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'ai-forum-uploads-'))
  })

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true })
  })

  it.each([
    [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png', 'png'],
    [Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg', 'jpg'],
    [Buffer.from('GIF89a'), 'image/gif', 'gif'],
    [Buffer.from('RIFF1234WEBP'), 'image/webp', 'webp'],
  ])('detects an image by its actual bytes', (data, mimeType, extension) => {
    expect(detectImageType(data)).toEqual({ mimeType, extension })
  })

  it('rejects SVG and files that only pretend to be images', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(detectImageType(Buffer.from('not really a png'))).toBeNull()
  })

  it('builds paths only for the generated upload URL shape', () => {
    const root = resolve('.data/uploads')
    const id = '123e4567-e89b-42d3-a456-426614174000'

    expect(resolveUploadPath(root, `2026/08/${id}.png`))
      .toBe(resolve(root, '2026', '08', `${id}.png`))
    expect(resolveUploadPath(root, '../ai-forum.db')).toBeNull()
    expect(resolveUploadPath(root, `2026/08/../../${id}.png`)).toBeNull()
    expect(resolveUploadPath(root, '2026/08/readme.txt')).toBeNull()
  })

  it('turns a filename into safe Markdown alt text', () => {
    expect(sanitizeImageAlt('我的[截图](最终版).png')).toBe('我的 截图 最终版')
    expect(sanitizeImageAlt('')).toBe('图片')
  })

  it('lists only generated image files from nested upload folders', async () => {
    const first = '2026/08/123e4567-e89b-42d3-a456-426614174000.png'
    const second = '2026/07/223e4567-e89b-42d3-a456-426614174001.jpg'
    await mkdir(join(uploadRoot, '2026', '08'), { recursive: true })
    await mkdir(join(uploadRoot, '2026', '07'), { recursive: true })
    await writeFile(join(uploadRoot, ...first.split('/')), Buffer.from('png'))
    await writeFile(join(uploadRoot, ...second.split('/')), Buffer.from('jpeg'))
    await writeFile(join(uploadRoot, '2026', '08', 'readme.txt'), Buffer.from('ignore me'))

    const files = await listStoredImages(uploadRoot)

    expect(files.map(file => file.path).sort()).toEqual([second, first])
    expect(files.reduce((sum, file) => sum + file.size, 0)).toBe(7)
  })

  it('finds local upload references in published posts and drafts', () => {
    const used = '2026/08/123e4567-e89b-42d3-a456-426614174000.png'
    expect(referencedUploadPaths([
      `正文\n\n![截图](/uploads/${used})`,
      `重复引用 ![截图](/uploads/${used})`,
      '![外部图片](https://example.com/image.png)',
    ])).toEqual(new Set([used]))
  })

  it('rejects a write that would cross the configured storage quota', () => {
    expect(() => assertUploadCapacity(10, 5, 14)).toThrow('图片存储空间已满')
    expect(() => assertUploadCapacity(10, 4, 14)).not.toThrow()
  })

  it('deletes only existing unreferenced generated files', async () => {
    const used = '2026/08/123e4567-e89b-42d3-a456-426614174000.png'
    const unused = '2026/08/223e4567-e89b-42d3-a456-426614174001.png'
    await mkdir(join(uploadRoot, '2026', '08'), { recursive: true })
    await writeFile(join(uploadRoot, ...used.split('/')), Buffer.from('used'))
    await writeFile(join(uploadRoot, ...unused.split('/')), Buffer.from('unused'))

    await expect(deleteStoredImage(uploadRoot, used, new Set([used])))
      .rejects.toThrow('图片仍被帖子引用')
    await expect(deleteStoredImage(uploadRoot, unused, new Set([used]))).resolves.toBe(true)
    await expect(deleteStoredImage(uploadRoot, unused, new Set([used]))).resolves.toBe(false)
  })
})
