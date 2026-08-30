export interface ComposerDraftFields {
  title: string
  slug: string
  excerpt: string
  categorySlug: string
  tags: string[]
  contentMarkdown: string
  externalUrl: string
  isPinned: boolean
  publishedAt: string
}

export interface ComposerDraft {
  version: 1
  savedAt: string
  preserveAcrossServerUpdate?: true
  fields: ComposerDraftFields
}

interface SerializeComposerDraftOptions {
  preserveAcrossServerUpdate?: boolean
}

export function composerDraftKey(topicId?: number): string {
  return topicId
    ? `ai-forum:composer-draft:topic:${topicId}`
    : 'ai-forum:composer-draft:new'
}

export function serializeComposerDraft(
  fields: ComposerDraftFields,
  savedAt = new Date(),
  options: SerializeComposerDraftOptions = {},
): string {
  const draft: ComposerDraft = {
    version: 1,
    savedAt: savedAt.toISOString(),
    fields: { ...fields, tags: [...fields.tags] },
  }
  if (options.preserveAcrossServerUpdate) draft.preserveAcrossServerUpdate = true
  return JSON.stringify(draft)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseFields(value: unknown): ComposerDraftFields | null {
  if (!isRecord(value)) return null
  const stringFields = [
    'title', 'slug', 'excerpt', 'categorySlug', 'contentMarkdown', 'externalUrl', 'publishedAt',
  ] as const
  if (stringFields.some(field => typeof value[field] !== 'string')) return null
  if (typeof value.isPinned !== 'boolean') return null
  if (!Array.isArray(value.tags) || value.tags.some(tag => typeof tag !== 'string')) return null

  return {
    title: value.title as string,
    slug: value.slug as string,
    excerpt: value.excerpt as string,
    categorySlug: value.categorySlug as string,
    tags: [...value.tags] as string[],
    contentMarkdown: value.contentMarkdown as string,
    externalUrl: value.externalUrl as string,
    isPinned: value.isPinned,
    publishedAt: value.publishedAt as string,
  }
}

export function parseComposerDraft(raw: string | null, serverUpdatedAt?: string | null): ComposerDraft | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.savedAt !== 'string') return null
    if (parsed.preserveAcrossServerUpdate !== undefined && parsed.preserveAcrossServerUpdate !== true) return null
    const savedTime = new Date(parsed.savedAt).getTime()
    if (!Number.isFinite(savedTime)) return null
    if (serverUpdatedAt && parsed.preserveAcrossServerUpdate !== true) {
      const serverTime = new Date(serverUpdatedAt).getTime()
      if (Number.isFinite(serverTime) && savedTime <= serverTime) return null
    }
    const fields = parseFields(parsed.fields)
    if (!fields) return null
    return {
      version: 1,
      savedAt: new Date(savedTime).toISOString(),
      ...(parsed.preserveAcrossServerUpdate === true ? { preserveAcrossServerUpdate: true as const } : {}),
      fields,
    }
  }
  catch {
    return null
  }
}
