import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const MARKDOWN_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 'blockquote', 'code', 'pre',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

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
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^[ \t]{0,3}(?:#{1,6}|>|[-+*])[ \t]+/gm, ' ')
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
  })

  return sanitizeHtml(rendered, {
    allowedTags: MARKDOWN_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
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
    },
  })
}
