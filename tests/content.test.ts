import { describe, expect, it } from 'vitest'
import { excerptFromMarkdown, renderSafeMarkdown, slugifyTopic, validateExternalUrl } from '../server/utils/content'

describe('slugifyTopic', () => {
  it('keeps Chinese words and normalizes separators for readable topic URLs', () => {
    expect(slugifyTopic('  ChatGPT：我的 5 个提示词 / 工作流  ')).toBe('chatgpt-我的-5-个提示词-工作流')
  })

  it('returns a stable fallback when the title has no usable characters', () => {
    expect(slugifyTopic('✨ 🚀')).toBe('topic')
  })
})

describe('excerptFromMarkdown', () => {
  it('removes Markdown syntax and truncates long text without splitting the suffix', () => {
    expect(excerptFromMarkdown('# 标题\n\n这是 **重要** 的[工具](https://example.com)。', 10)).toBe('标题 这是重要的工具…')
  })

  it('removes task-list markers from generated topic excerpts', () => {
    expect(excerptFromMarkdown('- [ ] 待办事项\n- [x] 已完成')).toBe('待办事项 已完成')
  })

  it('removes GFM table delimiter rows and thematic breaks from excerpts', () => {
    const markdown = '| 名称 | 地址 |\n| :--- | ---: |\n| 工具 | example.com |\n\n---\n\n正文'

    expect(excerptFromMarkdown(markdown)).toBe('名称 地址 工具 example.com 正文')
  })
})

describe('validateExternalUrl', () => {
  it('accepts only absolute http and https URLs', () => {
    expect(validateExternalUrl('https://example.com/tool')).toBe('https://example.com/tool')
    expect(validateExternalUrl('javascript:alert(1)')).toBeNull()
    expect(validateExternalUrl('/relative')).toBeNull()
  })
})

describe('renderSafeMarkdown', () => {
  it('renders blockquotes used by the composer preview', () => {
    expect(renderSafeMarkdown('正文\n\n> 引用内容')).toContain('<blockquote>')
  })

  it('renders useful Markdown while removing scripts, raw HTML, and unsafe links', () => {
    const html = renderSafeMarkdown('## 示例\n\n[安全](https://example.com) [危险](javascript:alert(1))\n\n<script>alert(1)</script>')

    expect(html).toContain('<h2>示例</h2>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<script>')
  })

  it('renders the GFM formats exposed by the composer toolbar', () => {
    const html = renderSafeMarkdown('~~删除线~~\n\n- [ ] 待办\n\n| 名称 | 地址 |\n| --- | --- |\n| 工具 | https://example.com |\n\n---')

    expect(html).toContain('<del>删除线</del>')
    expect(html).toContain('<input')
    expect(html).toContain('type="checkbox"')
    expect(html).toMatch(/<input[^>]*\bdisabled(?:="")?[^>]*>/)
    expect(html).toContain('<table>')
    expect(html).toMatch(/<hr\s*\/?>/)
  })

  it('never allows interactive form inputs through raw post HTML', () => {
    const html = renderSafeMarkdown('<input type="text" value="伪造输入框">')

    expect(html).not.toContain('type="text"')
    expect(html).not.toContain('value=')
    expect(html).toContain('type="checkbox"')
    expect(html).toMatch(/<input[^>]*\bdisabled(?:="")?[^>]*>/)
  })
})
