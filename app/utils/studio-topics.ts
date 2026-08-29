import type { StudioTopic } from '~/types/forum'

export type StudioTopicSort =
  | 'updated-desc'
  | 'published-desc'
  | 'published-asc'
  | 'views-desc'
  | 'title-asc'

export const STUDIO_TOPIC_SORT_OPTIONS: Array<{ value: StudioTopicSort, label: string }> = [
  { value: 'updated-desc', label: '最近修改' },
  { value: 'published-desc', label: '发布时间：新到旧' },
  { value: 'published-asc', label: '发布时间：旧到新' },
  { value: 'views-desc', label: '浏览量：高到低' },
  { value: 'title-asc', label: '标题：A 到 Z' },
]

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function comparePublished(
  first: StudioTopic,
  second: StudioTopic,
  direction: 'asc' | 'desc',
): number {
  if (!first.publishedAt && !second.publishedAt) return second.id - first.id
  if (!first.publishedAt) return 1
  if (!second.publishedAt) return -1
  const difference = direction === 'desc'
    ? timestamp(second.publishedAt) - timestamp(first.publishedAt)
    : timestamp(first.publishedAt) - timestamp(second.publishedAt)
  return difference || second.id - first.id
}

export function sortStudioTopics(topics: StudioTopic[], sort: StudioTopicSort): StudioTopic[] {
  return [...topics].sort((first, second) => {
    if (sort === 'published-desc') return comparePublished(first, second, 'desc')
    if (sort === 'published-asc') return comparePublished(first, second, 'asc')
    if (sort === 'views-desc') return second.viewCount - first.viewCount || second.id - first.id
    if (sort === 'title-asc') {
      return first.title.localeCompare(second.title, 'zh-CN', { sensitivity: 'base' })
        || second.id - first.id
    }
    return timestamp(second.updatedAt) - timestamp(first.updatedAt) || second.id - first.id
  })
}
