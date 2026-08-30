<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicPage } from '~/types/forum'
import { getErrorMessage, pageErrorDetails } from '~/utils/error-message'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const page = computed(() => typeof route.query.page === 'string' ? route.query.page : '1')
const { data: categories, error: categoriesError } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
const { data: topicPage, status, error, refresh } = await useFetch<TopicPage>('/api/topics', {
  query: { category: slug, page },
  default: () => ({ items: [], page: 1, pageSize: 30, total: 0, totalPages: 0 }),
})
const category = computed(() => categories.value.find(item => item.slug === slug.value))
if (categoriesError.value) {
  throw createError(pageErrorDetails(categoriesError.value, '板块不存在'))
}
if (!category.value) {
  throw createError({ statusCode: 404, message: '板块不存在' })
}
useCanonical(() => Number(page.value) > 1 ? `/c/${slug.value}?page=${page.value}` : `/c/${slug.value}`)

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
    :error-message="getErrorMessage(error, '')"
    eyebrow="CATEGORY"
    @retry="refresh"
  />
</template>
