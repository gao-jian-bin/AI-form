import { describe, expect, it } from 'vitest'
import { buildSitemapXml } from '../server/utils/seo'

describe('buildSitemapXml', () => {
  it('emits canonical published-topic URLs with escaped XML values', () => {
    const xml = buildSitemapXml('https://forum.example.com/', [
      { id: 7, slug: '提示词-&-工具', updatedAt: '2026-08-20T08:00:00.000Z' },
    ])

    expect(xml).toContain('<loc>https://forum.example.com/t/%E6%8F%90%E7%A4%BA%E8%AF%8D-%26-%E5%B7%A5%E5%85%B7/7</loc>')
    expect(xml).toContain('<lastmod>2026-08-20T08:00:00.000Z</lastmod>')
    expect(xml).not.toContain('draft')
  })
})
