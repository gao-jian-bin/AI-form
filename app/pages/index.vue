<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicPage } from '~/types/forum'

const route = useRoute()
const page = computed(() => typeof route.query.page === 'string' ? route.query.page : '1')
const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
const { data: topicPage, status, error, refresh } = await useFetch<TopicPage>('/api/topics', {
  query: { page },
  default: () => ({ items: [], page: 1, pageSize: 30, total: 0, totalPages: 0 }),
})
useCanonical(() => Number(page.value) > 1 ? `/?page=${page.value}` : '/')

useSeoMeta({
  title: '最新帖子',
  description: '持续收录 ChatGPT 技巧、AI 学习框架与实用在线工具。',
})
</script>

<template>
  <ForumPage
    title="最新帖子"
    description="按发布时间整理的全部知识条目。置顶内容适合第一次来时先读。"
    :topics="topicPage.items"
    :pagination="topicPage"
    :categories="categories"
    :tags="tags"
    :pending="status === 'pending'"
    :error-message="error?.statusMessage"
    @retry="refresh"
  />
</template>
