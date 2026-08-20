import { describe, expect, it } from 'vitest'
import { applyMarkdownAction } from '../app/utils/markdown-editor'

describe('applyMarkdownAction', () => {
  it('wraps the current selection in bold markers and keeps the inner text selected', () => {
    expect(applyMarkdownAction('这是重点内容', 2, 4, 'bold')).toEqual({
      value: '这是**重点**内容',
      selectionStart: 4,
      selectionEnd: 6,
    })
  })

  it('prefixes every selected line for quotes and lists', () => {
    expect(applyMarkdownAction('第一行\n第二行', 0, 7, 'quote').value).toBe('> 第一行\n> 第二行')
    expect(applyMarkdownAction('苹果\n香蕉', 0, 5, 'bullet-list').value).toBe('- 苹果\n- 香蕉')
    expect(applyMarkdownAction('苹果\n香蕉', 0, 5, 'numbered-list').value).toBe('1. 苹果\n2. 香蕉')
  })

  it('inserts an editable Markdown link when there is no selection', () => {
    expect(applyMarkdownAction('', 0, 0, 'link')).toEqual({
      value: '[链接文字](https://)',
      selectionStart: 1,
      selectionEnd: 5,
    })
  })

  it('uses fenced code for multiline selections and inline code for one line', () => {
    expect(applyMarkdownAction('const a = 1', 0, 11, 'code').value).toBe('`const a = 1`')
    expect(applyMarkdownAction('a\nb', 0, 3, 'code').value).toBe('```\na\nb\n```')
  })
})
