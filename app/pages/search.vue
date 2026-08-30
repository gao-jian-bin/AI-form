<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicPage } from '~/types/forum'

const route = useRoute()
const query = computed(() => typeof route.query.q === 'string' ? route.query.q.trim() : '')
const page = computed(() => typeof route.query.page === 'string' ? route.query.page : '1')
const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
const { data: topicPage, status, error, refresh } = await useFetch<TopicPage>('/api/topics', {
  query: { q: query, page },
  default: () => ({ items: [], page: 1, pageSize: 30, total: 0, totalPages: 0 }),
  watch: [query, page],
})

useSeoMeta({
  title: () => query.value ? `搜索：${query.value}` : '搜索',
  robots: 'noindex, follow',
})
</script>

<template>
  <ForumPage
    :title="query ? `搜索“${query}”` : '搜索主题'"
    :description="query ? '在标题、摘要与正文中查找匹配内容。' : '在搜索框中输入你想查找的内容。'"
    :topics="query ? topicPage.items : []"
    :pagination="query ? topicPage : undefined"
    :categories="categories"
    :tags="tags"
    :pending="Boolean(query) && status === 'pending'"
    :error-message="error?.statusMessage"
    eyebrow="SEARCH"
    @retry="refresh"
  />
</template>
