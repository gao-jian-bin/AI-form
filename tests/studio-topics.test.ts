import { describe, expect, it } from 'vitest'
import type { StudioTopic } from '../app/types/forum'
import { sortStudioTopics } from '../app/utils/studio-topics'

const category = { id: 1, name: 'ChatGPT', slug: 'chatgpt', color: '#0088cc' }
const topics: StudioTopic[] = [
  {
    id: 1,
    title: 'Banana',
    slug: 'banana',
    excerpt: '',
    contentMarkdown: '正文',
    status: 'published',
    isPinned: false,
    externalUrl: null,
    viewCount: 50,
    publishedAt: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z',
    category,
    tags: [],
  },
  {
    id: 2,
    title: 'Apple',
    slug: 'apple',
    excerpt: '',
    contentMarkdown: '正文',
    status: 'published',
    isPinned: false,
    externalUrl: null,
    viewCount: 10,
    publishedAt: '2026-02-01T08:00:00.000Z',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-01-02T08:00:00.000Z',
    category,
    tags: [],
  },
  {
    id: 3,
    title: 'Draft',
    slug: 'draft',
    excerpt: '',
    contentMarkdown: '正文',
    status: 'draft',
    isPinned: false,
    externalUrl: null,
    viewCount: 0,
    publishedAt: null,
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-02-15T08:00:00.000Z',
    category,
    tags: [],
  },
]

describe('sortStudioTopics', () => {
  it('sorts by the latest edit without mutating the API response', () => {
    expect(sortStudioTopics(topics, 'updated-desc').map(topic => topic.id)).toEqual([1, 3, 2])
    expect(topics.map(topic => topic.id)).toEqual([1, 2, 3])
  })

  it('sorts both directions by publish time and keeps unpublished drafts last', () => {
    expect(sortStudioTopics(topics, 'published-desc').map(topic => topic.id)).toEqual([2, 1, 3])
    expect(sortStudioTopics(topics, 'published-asc').map(topic => topic.id)).toEqual([1, 2, 3])
  })

  it('supports view-count and title sorting', () => {
    expect(sortStudioTopics(topics, 'views-desc').map(topic => topic.id)).toEqual([1, 2, 3])
    expect(sortStudioTopics(topics, 'title-asc').map(topic => topic.id)).toEqual([2, 1, 3])
  })
})
