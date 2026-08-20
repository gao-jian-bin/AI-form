import { describe, expect, it } from 'vitest'
import { parseTopicPayload } from '../server/utils/validation'

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

  it('rejects unsupported sections and malformed external links', () => {
    expect(() => parseTopicPayload({
      title: '主题',
      categorySlug: 'news',
      contentMarkdown: '正文',
      tags: [],
      status: 'published',
      isPinned: false,
    })).toThrow('请选择 ChatGPT 或工具箱板块')

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

  it('does not allow a tool link on a ChatGPT topic', () => {
    expect(() => parseTopicPayload({
      title: 'ChatGPT 主题',
      categorySlug: 'chatgpt',
      contentMarkdown: '正文',
      tags: [],
      status: 'draft',
      isPinned: false,
      externalUrl: 'https://example.com/',
    })).toThrow('只有工具箱主题可以设置工具链接')
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
})
