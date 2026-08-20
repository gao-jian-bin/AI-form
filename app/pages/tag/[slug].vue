<script setup lang="ts">
import type { ForumCategory, TopicSummary } from '~/types/forum'

const route = useRoute()
const tag = computed(() => decodeURIComponent(String(route.params.slug)))
const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: topics, status, error, refresh } = await useFetch<TopicSummary[]>('/api/topics', {
  query: { tag },
  default: () => [],
})
useCanonical(() => route.path)

useSeoMeta({
  title: () => `#${tag.value}`,
  description: () => `浏览标签“${tag.value}”下的全部主题。`,
})
</script>

<template>
  <ForumPage
    :title="`#${tag}`"
    description="同一个关键词下的跨板块内容。"
    :topics="topics"
    :categories="categories"
    :pending="status === 'pending'"
    :error-message="error?.statusMessage"
    eyebrow="TAG INDEX"
    @retry="refresh"
  />
</template>
