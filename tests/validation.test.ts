import { describe, expect, it } from 'vitest'
import {
  parseCategoryPayload,
  parsePublicTopicQuery,
  parseTagPayload,
  parseTopicPayload,
} from '../server/utils/validation'

describe('parseTopicPayload', () => {
  it('normalizes a valid editor payload into the database contract', () => {
    expect(parseTopicPayload({
      title: '  一个新主题  ',
      categorySlug: 'chatgpt',
      contentMarkdown: '  正文内容  ',
      tags: 'Prompt, 工作流，Prompt',
      status: 'published',
      isPinned: true,
      externalUrl: '',
    })).toEqual({
      title: '一个新主题',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文内容',
      tags: ['Prompt', '工作流'],
      status: 'published',
      isPinned: true,
      externalUrl: null,
    })
  })

  it('accepts a dynamic category and an external link in any category', () => {
    expect(parseTopicPayload({
      title: 'AI 图像资源',
      categorySlug: 'ai-image',
      contentMarkdown: '正文',
      tags: [],
      status: 'published',
      isPinned: false,
      externalUrl: 'https://example.com/resources',
    })).toEqual(expect.objectContaining({
      categorySlug: 'ai-image',
      externalUrl: 'https://example.com/resources',
    }))
  })

  it('rejects malformed category slugs and external links', () => {
    expect(() => parseTopicPayload({
      title: '主题',
      categorySlug: 'AI News',
      contentMarkdown: '正文',
      tags: [],
      status: 'published',
      isPinned: false,
    })).toThrow('板块网址标识格式不正确')

    expect(() => parseTopicPayload({
      title: '工具',
      categorySlug: 'toolbox',
      contentMarkdown: '正文',
      tags: [],
      status: 'published',
      isPinned: false,
      externalUrl: 'javascript:alert(1)',
    })).toThrow('工具链接必须是有效的 HTTP 或 HTTPS 地址')
  })

  it('keeps optional slug and excerpt fields when the editor supplies them', () => {
    expect(parseTopicPayload({
      title: '主题',
      slug: '  readable-topic  ',
      excerpt: '  自定义摘要  ',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      tags: [],
      status: 'draft',
      isPinned: false,
    })).toEqual(expect.objectContaining({
      slug: 'readable-topic',
      excerpt: '自定义摘要',
    }))
  })

  it('keeps an administrator supplied publish time', () => {
    expect(parseTopicPayload({
      title: '补录旧帖',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      tags: [],
      status: 'published',
      isPinned: false,
      publishedAt: '2024-01-01T08:00:00.000Z',
    })).toEqual(expect.objectContaining({
      publishedAt: '2024-01-01T08:00:00.000Z',
    }))
  })

  it('rejects an administrator supplied publish time in the future', () => {
    expect(() => parseTopicPayload({
      title: '未来帖子',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      tags: [],
      status: 'published',
      isPinned: false,
      publishedAt: '2999-01-01T00:00:00.000Z',
    })).toThrow('发布时间不能晚于当前时间')
  })

  it('rejects overlong or excessive topic tags before they reach SQLite', () => {
    const base = {
      title: '标签边界',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      status: 'published',
      isPinned: false,
    }
    expect(() => parseTopicPayload({ ...base, tags: ['x'.repeat(61)] }))
      .toThrow('单个标签不能超过 60 个字符')
    expect(() => parseTopicPayload({ ...base, tags: Array.from({ length: 9 }, (_, index) => `标签${index}`) }))
      .toThrow('一篇帖子最多选择 8 个标签')
  })
})

describe('parsePublicTopicQuery', () => {
  it('normalizes pagination and stable resource filters', () => {
    expect(parsePublicTopicQuery({
      category: 'chatgpt',
      tag: '工作流',
      q: '  Markdown  ',
      page: '2',
      pageSize: '25',
    })).toEqual({
      category: 'chatgpt',
      tagSlug: '工作流',
      query: 'Markdown',
      page: 2,
      pageSize: 25,
    })
  })

  it('rejects malformed or unbounded pagination values', () => {
    expect(() => parsePublicTopicQuery({ page: '0' })).toThrow('页码必须大于 0')
    expect(() => parsePublicTopicQuery({ pageSize: '5000' })).toThrow('每页最多显示 50 篇帖子')
    expect(() => parsePublicTopicQuery({ tag: '../private' })).toThrow('标签网址标识格式不正确')
  })
})

describe('parseCategoryPayload', () => {
  it('normalizes a category creation payload', () => {
    expect(parseCategoryPayload({
      name: '  AI 绘画  ',
      slug: 'ai-image',
      description: '  图片生成与处理  ',
      color: '#7C3AED',
      position: 3,
    }, 'create')).toEqual({
      name: 'AI 绘画',
      slug: 'ai-image',
      description: '图片生成与处理',
      color: '#7c3aed',
      position: 3,
    })
  })

  it('drops slug changes from category update payloads', () => {
    expect(parseCategoryPayload({
      name: 'AI 图像',
      slug: 'changed-slug',
      description: '',
      color: '#2563eb',
      position: 0,
    }, 'update')).toEqual({
      name: 'AI 图像',
      description: '',
      color: '#2563eb',
      position: 0,
    })
  })

  it.each([
    [{ name: '板块', slug: 'AI Image', description: '', color: '#2563eb', position: 1 }, '网址标识只能使用小写字母、数字和短横线'],
    [{ name: '板块', slug: 'ai-image', description: '', color: '#fff', position: 1 }, '颜色必须是六位十六进制色值'],
    [{ name: '板块', slug: 'ai-image', description: '', color: '#2563eb', position: -1 }, '排序不能小于 0'],
  ])('rejects invalid category values', (payload, message) => {
    expect(() => parseCategoryPayload(payload, 'create')).toThrow(message)
  })
})

describe('parseTagPayload', () => {
  it('normalizes a tag name for create and update requests', () => {
    expect(parseTagPayload({ name: '  AI 搜索  ' })).toEqual({ name: 'AI 搜索' })
  })

  it('rejects empty and overlong tag names', () => {
    expect(() => parseTagPayload({ name: '   ' })).toThrow('标签名称不能为空')
    expect(() => parseTagPayload({ name: 'x'.repeat(61) })).toThrow('标签名称不能超过 60 个字符')
  })
})
