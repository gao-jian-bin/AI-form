export interface ForumCategory {
  id: number
  name: string
  slug: string
  description: string
  color: string
  position: number
  topicCount: number
}

export interface StudioCategory extends ForumCategory {
  draftTopicCount: number
  publishedTopicCount: number
}

export interface ForumTag {
  id: number
  name: string
  slug: string
  topicCount: number
}

export interface TopicSummary {
  id: number
  title: string
  slug: string
  excerpt: string
  status: 'draft' | 'published'
  isPinned: boolean
  externalUrl: string | null
  viewCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  category: Pick<ForumCategory, 'id' | 'name' | 'slug' | 'color'>
  tags: string[]
}

export interface TopicDetail extends TopicSummary {
  contentHtml: string
}

export interface TopicPage {
  items: TopicSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface StudioTopic extends TopicSummary {
  contentMarkdown: string
}

export interface TopicRevision {
  id: number
  topicId: number
  title: string
  slug: string
  excerpt: string
  contentMarkdown: string
  categorySlug: string
  status: 'draft' | 'published'
  isPinned: boolean
  externalUrl: string | null
  publishedAt: string | null
  tags: string[]
  createdAt: string
}

export interface UploadInventoryItem {
  path: string
  url: string
  size: number
  modifiedAt: string
  referenced: boolean
}

export interface UploadInventory {
  items: UploadInventoryItem[]
  usedBytes: number
  quotaBytes: number
}
