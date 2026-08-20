export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'link'
  | 'quote'
  | 'code'
  | 'bullet-list'
  | 'numbered-list'
  | 'heading'

export interface MarkdownEditResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

export interface ComposerTool {
  id: MarkdownAction
  label: string
  text: string
  shortcut?: string
}

// 修改工具栏时只需要调整这个数组；TopicEditor 会按顺序渲染按钮。
export const COMPOSER_TOOLS: ComposerTool[] = [
  { id: 'bold', label: '粗体', text: 'B', shortcut: 'Ctrl+B' },
  { id: 'italic', label: '斜体', text: 'I', shortcut: 'Ctrl+I' },
  { id: 'link', label: '插入链接', text: '🔗', shortcut: 'Ctrl+K' },
  { id: 'quote', label: '引用', text: '❝' },
  { id: 'code', label: '代码', text: '</>' },
  { id: 'bullet-list', label: '无序列表', text: '•—' },
  { id: 'numbered-list', label: '有序列表', text: '1.' },
  { id: 'heading', label: '二级标题', text: 'H2' },
]

function replaceSelection(
  value: string,
  start: number,
  end: number,
  replacement: string,
  innerStart = 0,
  innerLength = replacement.length,
): MarkdownEditResult {
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart: start + innerStart,
    selectionEnd: start + innerStart + innerLength,
  }
}

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): MarkdownEditResult {
  const selected = value.slice(start, end) || placeholder
  return replaceSelection(
    value,
    start,
    end,
    `${before}${selected}${after}`,
    before.length,
    selected.length,
  )
}

function prefixLines(
  value: string,
  start: number,
  end: number,
  prefix: (index: number) => string,
  placeholder: string,
): MarkdownEditResult {
  const selected = value.slice(start, end) || placeholder
  const replacement = selected
    .split('\n')
    .map((line, index) => `${prefix(index)}${line}`)
    .join('\n')
  return replaceSelection(value, start, end, replacement, 0, replacement.length)
}

export function applyMarkdownAction(
  value: string,
  start: number,
  end: number,
  action: MarkdownAction,
): MarkdownEditResult {
  switch (action) {
    case 'bold':
      return wrapSelection(value, start, end, '**', '**', '粗体文字')
    case 'italic':
      return wrapSelection(value, start, end, '*', '*', '斜体文字')
    case 'link': {
      const selected = value.slice(start, end) || '链接文字'
      return replaceSelection(value, start, end, `[${selected}](https://)`, 1, selected.length)
    }
    case 'quote':
      return prefixLines(value, start, end, () => '> ', '引用内容')
    case 'bullet-list':
      return prefixLines(value, start, end, () => '- ', '列表项')
    case 'numbered-list':
      return prefixLines(value, start, end, index => `${index + 1}. `, '列表项')
    case 'heading':
      return prefixLines(value, start, end, () => '## ', '标题')
    case 'code': {
      const selected = value.slice(start, end) || '代码'
      if (selected.includes('\n')) {
        return replaceSelection(value, start, end, `\`\`\`\n${selected}\n\`\`\``, 4, selected.length)
      }
      return wrapSelection(value, start, end, '`', '`', '代码')
    }
  }
}
