import { z } from 'zod'
import type { CategoryInput, CategoryUpdateInput, TopicInput } from './database'
import { validateExternalUrl } from './content'

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const rawTopicSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(140, '标题不能超过 140 个字符'),
  slug: z.string().trim().max(160, 'Slug 不能超过 160 个字符').optional(),
  excerpt: z.string().trim().max(280, '摘要不能超过 280 个字符').optional(),
  categorySlug: z.string().trim().min(1, '请选择板块').max(80, '板块网址标识不能超过 80 个字符')
    .regex(CATEGORY_SLUG_PATTERN, '板块网址标识格式不正确'),
  contentMarkdown: z.string().trim().min(1, '正文不能为空').max(200_000, '正文内容过长'),
  tags: z.union([z.string(), z.array(z.string())]).default([]),
  status: z.enum(['draft', 'published']),
  isPinned: z.boolean().default(false),
  externalUrl: z.string().nullish(),
  publishedAt: z.string().datetime({ offset: true }).nullish()
    .refine(value => !value || new Date(value).getTime() <= Date.now(), '发布时间不能晚于当前时间'),
})

type ParsedTopicPayload = Omit<TopicInput, 'id'>

export function parseTopicPayload(value: unknown): ParsedTopicPayload {
  const parsed = rawTopicSchema.parse(value)

  const rawTags = Array.isArray(parsed.tags)
    ? parsed.tags
    : parsed.tags.split(/[,，]/)
  const tags = [...new Set(rawTags.map(tag => tag.trim()).filter(Boolean))].slice(0, 8)

  const suppliedUrl = parsed.externalUrl?.trim() || null
  const externalUrl = suppliedUrl ? validateExternalUrl(suppliedUrl) : null
  if (suppliedUrl && !externalUrl) {
    throw new Error('工具链接必须是有效的 HTTP 或 HTTPS 地址')
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
  if (parsed.publishedAt) result.publishedAt = parsed.publishedAt
  return result
}

const categoryFields = {
  name: z.string().trim().min(1, '板块名称不能为空').max(60, '板块名称不能超过 60 个字符'),
  description: z.string().trim().max(300, '板块说明不能超过 300 个字符').default(''),
  color: z.string().trim()
    .regex(/^#[0-9a-fA-F]{6}$/, '颜色必须是六位十六进制色值')
    .transform(value => value.toLocaleLowerCase()),
  position: z.number().int('排序必须是整数').min(0, '排序不能小于 0').max(9999, '排序不能超过 9999'),
}

const createCategorySchema = z.object({
  ...categoryFields,
  slug: z.string().trim().min(1, '网址标识不能为空').max(80, '网址标识不能超过 80 个字符')
    .regex(CATEGORY_SLUG_PATTERN, '网址标识只能使用小写字母、数字和短横线'),
})

const updateCategorySchema = z.object(categoryFields)

export function parseCategoryPayload(value: unknown, mode: 'create'): CategoryInput
export function parseCategoryPayload(value: unknown, mode: 'update'): CategoryUpdateInput
export function parseCategoryPayload(
  value: unknown,
  mode: 'create' | 'update',
): CategoryInput | CategoryUpdateInput {
  return mode === 'create'
    ? createCategorySchema.parse(value)
    : updateCategorySchema.parse(value)
}
