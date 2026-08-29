import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  detectImageType,
  resolveUploadPath,
  sanitizeImageAlt,
} from '../server/utils/uploads'

describe('image uploads', () => {
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
})
