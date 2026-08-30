<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicPage } from '~/types/forum'
import { getErrorMessage, pageErrorDetails } from '~/utils/error-message'

const route = useRoute()
const requestedTag = decodeURIComponent(String(route.params.slug))
const page = computed(() => typeof route.query.page === 'string' ? route.query.page : '1')
const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags, error: tagsError } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
if (tagsError.value) {
  throw createError(pageErrorDetails(tagsError.value, '标签不存在'))
}
const slugMatch = tags.value.find(item => item.slug.toLocaleLowerCase() === requestedTag.toLocaleLowerCase())
const legacyNameMatch = tags.value.find(item => item.name.toLocaleLowerCase() === requestedTag.toLocaleLowerCase())
const tag = slugMatch || legacyNameMatch
if (!tag) {
  throw createError({ statusCode: 404, message: '标签不存在' })
}
if (tag && !slugMatch) {
  await navigateTo({ path: `/tag/${encodeURIComponent(tag.slug)}`, query: route.query }, { redirectCode: 301, replace: true })
}
const { data: topicPage, status, error, refresh } = await useFetch<TopicPage>('/api/topics', {
  query: { tag: tag?.slug || requestedTag, page },
  default: () => ({ items: [], page: 1, pageSize: 30, total: 0, totalPages: 0 }),
})
useCanonical(() => Number(page.value) > 1 ? `/tag/${tag.slug}?page=${page.value}` : `/tag/${tag.slug}`)

useSeoMeta({
  title: () => `#${tag?.name || requestedTag}`,
  description: () => `浏览标签“${tag?.name || requestedTag}”下的全部主题。`,
})
</script>

<template>
  <ForumPage
    :title="`#${tag?.name || requestedTag}`"
    description="同一个关键词下的跨板块内容。"
    :topics="topicPage.items"
    :pagination="topicPage"
    :categories="categories"
    :tags="tags"
    :active-tag="tag?.slug || requestedTag"
    :pending="status === 'pending'"
    :error-message="getErrorMessage(error, '')"
    eyebrow="TAG INDEX"
    @retry="refresh"
  />
</template>
