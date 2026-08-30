<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicPage } from '~/types/forum'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const page = computed(() => typeof route.query.page === 'string' ? route.query.page : '1')
const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
const { data: topicPage, status, error, refresh } = await useFetch<TopicPage>('/api/topics', {
  query: { category: slug, page },
  default: () => ({ items: [], page: 1, pageSize: 30, total: 0, totalPages: 0 }),
})
const category = computed(() => categories.value.find(item => item.slug === slug.value))
useCanonical(() => route.path)

useSeoMeta({
  title: () => category.value?.name || '内容板块',
  description: () => category.value?.description || '浏览这个板块的全部主题。',
})
</script>

<template>
  <ForumPage
    :title="category?.name || '内容板块'"
    :description="category?.description || '这个板块还在整理中。'"
    :topics="topicPage.items"
    :pagination="topicPage"
    :categories="categories"
    :tags="tags"
    :active-category="slug"
    :pending="status === 'pending'"
    :error-message="error?.statusMessage"
    eyebrow="CATEGORY"
    @retry="refresh"
  />
</template>
