export interface ForumCategory {
  id: number
  name: string
  slug: string
  description: string
  color: string
  position: number
  topicCount: number
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

export interface StudioTopic extends TopicSummary {
  contentMarkdown: string
}
