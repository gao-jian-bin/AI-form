import { describe, expect, it } from 'vitest'
import { applyMarkdownAction, insertMarkdownBlock } from '../app/utils/markdown-editor'

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

  it('starts a placeholder quote on a valid Markdown block boundary', () => {
    expect(applyMarkdownAction('正文', 2, 2, 'quote')).toEqual({
      value: '正文\n\n> 引用内容',
      selectionStart: 6,
      selectionEnd: 10,
    })
  })

  it.each([
    ['bullet-list', '正文\n\n- 列表项'],
    ['numbered-list', '正文\n\n1. 列表项'],
    ['heading', '正文\n\n## 标题'],
  ] as const)('starts %s placeholders on a valid Markdown block boundary', (action, expected) => {
    expect(applyMarkdownAction('正文', 2, 2, action).value).toBe(expected)
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

  it('separates fenced code from surrounding paragraph text', () => {
    expect(applyMarkdownAction('前文a\nb后文', 2, 5, 'code').value)
      .toBe('前文\n\n```\na\nb\n```\n\n后文')
  })
})

describe('insertMarkdownBlock', () => {
  it('inserts uploads on a Markdown block boundary and leaves the caret after them', () => {
    expect(insertMarkdownBlock('正文', 2, 2, '![截图](/uploads/image.png)')).toEqual({
      value: '正文\n\n![截图](/uploads/image.png)',
      selectionStart: 29,
      selectionEnd: 29,
    })
  })

  it('replaces a selected range without swallowing the text after it', () => {
    expect(insertMarkdownBlock('前文占位后文', 2, 4, '[正在上传图片…]')).toEqual({
      value: '前文\n\n[正在上传图片…]\n\n后文',
      selectionStart: 13,
      selectionEnd: 13,
    })
  })
})
