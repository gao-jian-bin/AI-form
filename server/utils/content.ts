import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const MARKDOWN_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 'blockquote', 'code', 'pre',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'a', 'aside', 'header', 'article', 'img', 'input',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const markdownRenderer = new marked.Renderer()
const renderParagraph = markdownRenderer.paragraph.bind(markdownRenderer)

markdownRenderer.paragraph = (token) => {
  const link = token.tokens.length === 1 && token.tokens[0]?.type === 'link'
    ? token.tokens[0]
    : null
  const href = link ? validateExternalUrl(link.href) : null
  if (!link || !href) return renderParagraph(token)

  const url = new URL(href)
  const hostname = url.hostname.replace(/^www\./, '')
  const linkText = link.text.trim()
  const title = !linkText || linkText === link.href ? hostname : linkText
  const description = link.title?.trim() || `打开 ${hostname}`

  return `<aside class="onebox"><header class="onebox__source"><a class="onebox__source-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(`访问来源 ${hostname}`)}">${escapeHtml(hostname)}</a></header><article class="onebox__body"><h3 class="onebox__title"><a class="onebox__title-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(`${title}，在新窗口打开`)}">${escapeHtml(title)}</a></h3><p class="onebox__description">${escapeHtml(description)}</p></article></aside>\n`
}

export function slugifyTopic(title: string): string {
  const slug = title
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'topic'
}

export function excerptFromMarkdown(markdown: string, maxLength = 120): string {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^[ \t]*(?=[^\r\n]*\|)(?=[^\r\n]*-)[|:\- \t]+$/gm, ' ')
    .replace(/^[ \t]{0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^[ \t]{0,3}(?:#{1,6}|>|[-+*])[ \t]+/gm, ' ')
    .replace(/^[ \t]*\[[ xX]\][ \t]+/gm, '')
    .replace(/[ \t]+([*_~`]+)/g, '$1')
    .replace(/([*_~`]+)[ \t]+/g, '$1')
    .replace(/[*_~`|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (plainText.length <= maxLength) return plainText
  return `${plainText.slice(0, maxLength).trimEnd()}…`
}

export function validateExternalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null

  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.href
  } catch {
    return null
  }
}

export function renderSafeMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: false,
    renderer: markdownRenderer,
  })

  const safeHtml = sanitizeHtml(rendered, {
    allowedTags: MARKDOWN_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel', 'class', 'aria-label'],
      aside: ['class'],
      header: ['class'],
      article: ['class'],
      h3: ['class'],
      p: ['class'],
      img: ['src', 'alt', 'title', 'loading'],
      input: ['type', 'checked', 'disabled'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
    },
    allowedClasses: {
      a: ['onebox__source-link', 'onebox__title-link'],
      aside: ['onebox'],
      header: ['onebox__source'],
      article: ['onebox__body'],
      h3: ['onebox__title'],
      p: ['onebox__description'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: {
          ...attribs,
          loading: 'lazy',
        },
      }),
      input: (_tagName, attribs) => ({
        tagName: 'input',
        attribs: {
          type: 'checkbox',
          disabled: '',
          ...(Object.prototype.hasOwnProperty.call(attribs, 'checked') ? { checked: '' } : {}),
        },
      }),
    },
  })

  return safeHtml.replace(
    /<pre>([\s\S]*?)<\/pre>/g,
    '<div class="code-block-wrapper"><button type="button" class="code-block-copy" data-copy-code aria-label="复制预格式化文本">复制</button><pre>$1</pre></div>',
  )
}
