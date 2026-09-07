import { describe, expect, it } from 'vitest'
import { buildAtomFeedXml, buildSitemapXml } from '../server/utils/seo'

describe('buildSitemapXml', () => {
  it('emits canonical published-topic URLs with escaped XML values', () => {
    const xml = buildSitemapXml('https://forum.example.com/', {
      categories: [{ slug: 'chatgpt' }],
      tags: [{ slug: '工作流' }],
      topics: [{ id: 7, slug: '提示词-&-工具', updatedAt: '2026-08-20T08:00:00.000Z' }],
    })

    expect(xml).toContain('<loc>https://forum.example.com/</loc>')
    expect(xml).toContain('<loc>https://forum.example.com/c/chatgpt</loc>')
    expect(xml).toContain('<loc>https://forum.example.com/tag/%E5%B7%A5%E4%BD%9C%E6%B5%81</loc>')
    expect(xml).toContain('<loc>https://forum.example.com/t/7</loc>')
    expect(xml).toContain('<lastmod>2026-08-20T08:00:00.000Z</lastmod>')
    expect(xml).not.toContain('draft')
  })
})

describe('buildAtomFeedXml', () => {
  it('emits escaped summaries and canonical entry links ordered by supplied topics', () => {
    const xml = buildAtomFeedXml('https://forum.example.com/', {
      siteName: 'AI & 工具',
      description: '知识 <聚合>',
      topics: [{
        id: 8,
        slug: 'markdown-技巧',
        title: 'Markdown & ChatGPT',
        excerpt: '使用 <代码> 与引用。',
        publishedAt: '2026-08-19T08:00:00.000Z',
        updatedAt: '2026-08-20T08:00:00.000Z',
      }],
    })

    expect(xml).toContain('<title>AI &amp; 工具</title>')
    expect(xml).toContain('<subtitle>知识 &lt;聚合&gt;</subtitle>')
    expect(xml).toContain('<title>Markdown &amp; ChatGPT</title>')
    expect(xml).toContain('<summary type="text">使用 &lt;代码&gt; 与引用。</summary>')
    expect(xml).toContain('href="https://forum.example.com/t/8"')
    expect(xml).not.toContain('<代码>')
  })

  it('uses the newest entry update time for the feed metadata', () => {
    const xml = buildAtomFeedXml('https://forum.example.com', {
      siteName: 'AI 论坛',
      description: '知识聚合',
      topics: [
        {
          id: 1, slug: 'pinned-old', title: '旧置顶', excerpt: '',
          publishedAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-02-01T00:00:00.000Z',
        },
        {
          id: 2, slug: 'newer', title: '新内容', excerpt: '',
          publishedAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z',
        },
      ],
    })

    expect(xml).toContain('  <updated>2025-02-01T00:00:00.000Z</updated>')
  })
})
