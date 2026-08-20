import { z } from 'zod'
import type { TopicInput } from './database'
import { validateExternalUrl } from './content'

const rawTopicSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(140, '标题不能超过 140 个字符'),
  slug: z.string().trim().max(160, 'Slug 不能超过 160 个字符').optional(),
  excerpt: z.string().trim().max(280, '摘要不能超过 280 个字符').optional(),
  categorySlug: z.string(),
  contentMarkdown: z.string().trim().min(1, '正文不能为空').max(200_000, '正文内容过长'),
  tags: z.union([z.string(), z.array(z.string())]).default([]),
  status: z.enum(['draft', 'published']),
  isPinned: z.boolean().default(false),
  externalUrl: z.string().nullish(),
})

type ParsedTopicPayload = Omit<TopicInput, 'id'>

export function parseTopicPayload(value: unknown): ParsedTopicPayload {
  const parsed = rawTopicSchema.parse(value)
  if (!['chatgpt', 'toolbox'].includes(parsed.categorySlug)) {
    throw new Error('请选择 ChatGPT 或工具箱板块')
  }

  const rawTags = Array.isArray(parsed.tags)
    ? parsed.tags
    : parsed.tags.split(/[,，]/)
  const tags = [...new Set(rawTags.map(tag => tag.trim()).filter(Boolean))].slice(0, 8)

  const suppliedUrl = parsed.externalUrl?.trim() || null
  const externalUrl = suppliedUrl ? validateExternalUrl(suppliedUrl) : null
  if (suppliedUrl && !externalUrl) {
    throw new Error('工具链接必须是有效的 HTTP 或 HTTPS 地址')
  }
  if (parsed.categorySlug !== 'toolbox' && externalUrl) {
    throw new Error('只有工具箱主题可以设置工具链接')
  }

  const result: ParsedTopicPayload = {
    title: parsed.title,
    categorySlug: parsed.categorySlug,
    contentMarkdown: parsed.contentMarkdown,
    tags,
    status: parsed.status,
    isPinned: parsed.isPinned,
    externalUrl,
  }
  if (parsed.slug) result.slug = parsed.slug
  if (parsed.excerpt) result.excerpt = parsed.excerpt
  return result
}
