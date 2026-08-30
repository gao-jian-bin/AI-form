export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'link'
  | 'quote'
  | 'code'
  | 'code-block'
  | 'bullet-list'
  | 'numbered-list'
  | 'task-list'
  | 'heading'
  | 'heading-3'
  | 'table'
  | 'horizontal-rule'

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
  { id: 'strikethrough', label: '删除线', text: 'S̶' },
  { id: 'link', label: '插入链接', text: '🔗', shortcut: 'Ctrl+K' },
  { id: 'quote', label: '引用', text: '❝' },
  { id: 'code', label: '行内代码', text: '</>' },
  { id: 'code-block', label: '代码块', text: '{ }' },
  { id: 'bullet-list', label: '无序列表', text: '•—' },
  { id: 'numbered-list', label: '有序列表', text: '1.' },
  { id: 'task-list', label: '任务列表', text: '☐' },
  { id: 'heading', label: '二级标题', text: 'H2' },
  { id: 'heading-3', label: '三级标题', text: 'H3' },
  { id: 'table', label: '插入表格', text: '表' },
  { id: 'horizontal-rule', label: '分割线', text: '—' },
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

function replaceBlock(
  value: string,
  start: number,
  end: number,
  block: string,
  innerStart = 0,
  innerLength = block.length,
): MarkdownEditResult {
  const before = value.slice(0, start)
  const after = value.slice(end)
  const leading = !before
    ? ''
    : before.endsWith('\n\n')
      ? ''
      : before.endsWith('\n') ? '\n' : '\n\n'
  const trailing = !after
    ? ''
    : after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n') ? '\n' : '\n\n'

  return replaceSelection(
    value,
    start,
    end,
    `${leading}${block}${trailing}`,
    leading.length + innerStart,
    innerLength,
  )
}

export function insertMarkdownBlock(
  value: string,
  start: number,
  end: number,
  block: string,
): MarkdownEditResult {
  return replaceBlock(value, start, end, block, block.length, 0)
}

function isInsideFencedCode(value: string, lineStart: number): boolean {
  let fenceCharacter = ''
  let fenceLength = 0

  for (const line of value.slice(0, lineStart).split('\n')) {
    if (!fenceCharacter) {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
      if (!opening) continue
      const marker = opening[1]!
      if (marker[0] === '`' && opening[2]?.includes('`')) continue
      fenceCharacter = marker[0]!
      fenceLength = marker.length
      continue
    }

    const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)
    const marker = closing?.[1]
    if (marker?.[0] === fenceCharacter && marker.length >= fenceLength) {
      fenceCharacter = ''
      fenceLength = 0
    }
  }

  return Boolean(fenceCharacter)
}

export function continueOrderedList(
  value: string,
  start: number,
  end: number,
): MarkdownEditResult | null {
  if (start !== end) return null

  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextLineBreak = value.indexOf('\n', start)
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak
  const line = value.slice(lineStart, lineEnd)
  const match = line.match(/^([ \t]{0,3})(\d{1,9})([.)])[ \t]+(.*)$/)
  if (!match || isInsideFencedCode(value, lineStart)) return null

  const [, indentation, number, delimiter, content] = match
  const contentStart = lineStart + line.length - (content?.length ?? 0)
  if (start < contentStart) return null
  if (!content?.trim()) {
    return replaceSelection(value, lineStart, lineEnd, '', 0, 0)
  }

  const nextMarker = `\n${indentation}${Number(number) + 1}${delimiter} `
  return replaceSelection(value, start, end, nextMarker, nextMarker.length, 0)
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

function prefixBlockLines(
  value: string,
  start: number,
  end: number,
  prefix: (index: number) => string,
  placeholder: string,
): MarkdownEditResult {
  const hasSelection = end > start
  const selected = hasSelection ? value.slice(start, end) : placeholder
  const replacement = selected
    .split('\n')
    .map((line, index) => `${prefix(index)}${line}`)
    .join('\n')
  return replaceBlock(
    value,
    start,
    end,
    replacement,
    hasSelection ? 0 : prefix(0).length,
    hasSelection ? replacement.length : placeholder.length,
  )
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
    case 'strikethrough':
      return wrapSelection(value, start, end, '~~', '~~', '删除线文字')
    case 'link': {
      const selected = value.slice(start, end) || '链接文字'
      return replaceSelection(value, start, end, `[${selected}](https://)`, 1, selected.length)
    }
    case 'quote':
      return prefixBlockLines(value, start, end, () => '> ', '引用内容')
    case 'bullet-list':
      return prefixBlockLines(value, start, end, () => '- ', '列表项')
    case 'numbered-list':
      return prefixBlockLines(value, start, end, index => `${index + 1}. `, '列表项')
    case 'task-list':
      return prefixBlockLines(value, start, end, () => '- [ ] ', '待办事项')
    case 'heading':
      return prefixBlockLines(value, start, end, () => '## ', '标题')
    case 'heading-3':
      return prefixBlockLines(value, start, end, () => '### ', '三级标题')
    case 'code': {
      const selected = value.slice(start, end) || '代码'
      if (selected.includes('\n')) {
        return replaceBlock(value, start, end, `\`\`\`\n${selected}\n\`\`\``, 4, selected.length)
      }
      return wrapSelection(value, start, end, '`', '`', '代码')
    }
    case 'code-block': {
      const selected = value.slice(start, end) || '代码内容'
      return replaceBlock(value, start, end, `\`\`\`\n${selected}\n\`\`\``, 4, selected.length)
    }
    case 'table': {
      const beforeSelection = '| 列 1 | 列 2 |\n| --- | --- |\n| '
      const block = `${beforeSelection}内容 | 内容 |`
      const insertionPoint = end > start ? end : start
      return replaceBlock(value, insertionPoint, insertionPoint, block, beforeSelection.length, 2)
    }
    case 'horizontal-rule': {
      const insertionPoint = end > start ? end : start
      return replaceBlock(value, insertionPoint, insertionPoint, '---', 3, 0)
    }
  }
}
