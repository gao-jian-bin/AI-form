<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicDetail, TopicPage } from '~/types/forum'
import { formatDottedDate } from '~/utils/date-format'
import { pageErrorDetails } from '~/utils/error-message'
import { serializeJsonLd } from '~/utils/json-ld'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: topic, error, refresh } = await useFetch<TopicDetail>(() => `/api/topics/${id.value}`)

if (error.value) {
  throw createError(pageErrorDetails(error.value, '主题不存在'))
}
if (!topic.value) {
  throw createError({ statusCode: 404, message: '主题不存在' })
}

const canonicalPath = computed(() => `/t/${encodeURIComponent(topic.value!.slug)}/${topic.value!.id}`)
if (String(route.params.slug) !== topic.value.slug) {
  await navigateTo(canonicalPath.value, { redirectCode: 301, replace: true })
}

const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
const { data: adminSession } = await useFetch<{ authenticated: boolean }>('/api/auth/session', {
  default: () => ({ authenticated: false }),
})
const { openEdit, revision } = useAdminComposer()
watch(revision, () => refresh())
const { data: related } = await useFetch<TopicPage>('/api/topics', {
  query: { category: topic.value.category.slug, pageSize: 5 },
  default: () => ({ items: [], page: 1, pageSize: 5, total: 0, totalPages: 0 }),
})
const relatedTopics = computed(() => related.value.items.filter(item => item.id !== id.value).slice(0, 4))

function tagUrl(name: string): string {
  const tag = tags.value.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  return `/tag/${encodeURIComponent(tag?.slug || name)}`
}

useSeoMeta({
  title: () => topic.value?.title || '主题',
  description: () => topic.value?.excerpt || '',
  ogTitle: () => topic.value?.title || '主题',
  ogDescription: () => topic.value?.excerpt || '',
  ogType: 'article',
})

const requestUrl = useRequestURL()
useCanonical(() => canonicalPath.value)
useHead(() => ({
  script: [{
    key: 'topic-json-ld',
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: topic.value?.title,
      description: topic.value?.excerpt,
      datePublished: topic.value?.publishedAt || topic.value?.createdAt,
      dateModified: topic.value?.updatedAt,
      mainEntityOfPage: new URL(canonicalPath.value, requestUrl.origin).href,
      author: { '@type': 'Person', name: '站长' },
    }),
  }],
}))

onMounted(() => {
  $fetch(`/api/topics/${id.value}/view`, { method: 'POST' }).catch(() => undefined)
})
</script>

<template>
  <div v-if="topic" class="discourse-wrap">
    <div id="main-outlet-wrapper" class="has-sidebar-page">
      <ForumSidebar :categories="categories" :tags="tags" :active-category="topic.category.slug" />

      <section id="main-outlet" class="topic-page-container">
        <header id="topic-title">
          <h1>{{ topic.title }}</h1>
          <div class="topic-category-tags">
            <NuxtLink :to="`/c/${topic.category.slug}`" class="badge-category">
              <span class="badge-category__bullet" :style="{ backgroundColor: topic.category.color }" />
              <span class="badge-category__name">{{ topic.category.name }}</span>
            </NuxtLink>
            <NuxtLink v-for="tag in topic.tags" :key="tag" :to="tagUrl(tag)" class="discourse-tag">{{ tag }}</NuxtLink>
          </div>
        </header>

        <div class="post-stream">
          <article class="topic-post">
            <div class="topic-avatar" aria-hidden="true"><span>站</span></div>
            <div class="topic-body">
              <div class="topic-meta-data">
                <div class="names"><strong>站长</strong><span>内容维护者</span></div>
                <div class="post-infos">
                  <span>{{ topic.viewCount }} 次浏览</span>
                  <time :datetime="topic.publishedAt || topic.createdAt">{{ formatDottedDate(topic.publishedAt || topic.createdAt) }}</time>
                  <span class="post-number">#1</span>
                </div>
              </div>

              <MarkdownContent class="cooked" :html="topic.contentHtml" />

              <div v-if="topic.externalUrl || adminSession.authenticated" class="post-actions">
                <a v-if="topic.externalUrl" :href="topic.externalUrl" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
                  访问工具
                  <span aria-hidden="true">↗</span>
                </a>
                <button
                  v-if="adminSession.authenticated"
                  class="btn post-action-menu__edit"
                  type="button"
                  aria-label="编辑帖子"
                  title="编辑帖子"
                  @click="openEdit(topic.id)"
                >
                  <svg class="row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                    <path d="m13.5 6.5 4 4" />
                  </svg>
                  <span>编辑</span>
                </button>
              </div>
            </div>
          </article>
        </div>

        <section v-if="relatedTopics.length" class="suggested-topics">
          <h2>推荐主题</h2>
          <table class="topic-list" aria-label="推荐主题">
            <thead class="topic-list-header"><tr><th class="topic-list-data default">主题</th><th class="topic-list-data num views">浏览</th><th class="topic-list-data num activity">活动</th></tr></thead>
            <tbody class="topic-list-body"><TopicRow v-for="item in relatedTopics" :key="item.id" :topic="item" :available-tags="tags" /></tbody>
          </table>
        </section>
      </section>
    </div>
  </div>
</template>
