<script setup lang="ts">
import type { ForumCategory, TopicSummary } from '~/types/forum'

const route = useRoute()
const query = computed(() => typeof route.query.q === 'string' ? route.query.q.trim() : '')
const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: topics, status, error, refresh } = await useFetch<TopicSummary[]>('/api/topics', {
  query: { q: query },
  default: () => [],
  watch: [query],
})

useSeoMeta({
  title: () => query.value ? `搜索：${query.value}` : '搜索',
  robots: 'noindex, follow',
})
</script>

<template>
  <ForumPage
    :title="query ? `搜索“${query}”` : '搜索主题'"
    :description="query ? '在标题、摘要与正文中查找匹配内容。' : '在右上角输入你想查找的内容。'"
    :topics="query ? topics : []"
    :categories="categories"
    :pending="Boolean(query) && status === 'pending'"
    :error-message="error?.statusMessage"
    eyebrow="SEARCH"
    @retry="refresh"
  />
</template>
