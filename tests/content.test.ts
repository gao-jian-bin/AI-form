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
})

describe('validateExternalUrl', () => {
  it('accepts only absolute http and https URLs', () => {
    expect(validateExternalUrl('https://example.com/tool')).toBe('https://example.com/tool')
    expect(validateExternalUrl('javascript:alert(1)')).toBeNull()
    expect(validateExternalUrl('/relative')).toBeNull()
  })
})

describe('renderSafeMarkdown', () => {
  it('renders useful Markdown while removing scripts, raw HTML, and unsafe links', () => {
    const html = renderSafeMarkdown('## 示例\n\n[安全](https://example.com) [危险](javascript:alert(1))\n\n<script>alert(1)</script>')

    expect(html).toContain('<h2>示例</h2>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<script>')
  })
})
