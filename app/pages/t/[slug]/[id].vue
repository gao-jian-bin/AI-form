<script setup lang="ts">
import type { ForumCategory, ForumTag, TopicDetail, TopicSummary } from '~/types/forum'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: topic, error, refresh } = await useFetch<TopicDetail>(() => `/api/topics/${id.value}`)
useCanonical(() => route.path)

if (error.value || !topic.value) {
  throw createError({ statusCode: 404, statusMessage: '主题不存在' })
}

const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: tags } = await useFetch<ForumTag[]>('/api/tags', { default: () => [] })
const { data: adminSession } = await useFetch<{ authenticated: boolean }>('/api/auth/session', {
  default: () => ({ authenticated: false }),
})
const { openEdit, revision } = useAdminComposer()
watch(revision, () => refresh())
const { data: related } = await useFetch<TopicSummary[]>('/api/topics', {
  query: { category: topic.value.category.slug, limit: 5 },
  default: () => [],
})
const relatedTopics = computed(() => related.value.filter(item => item.id !== id.value).slice(0, 4))

useSeoMeta({
  title: () => topic.value?.title || '主题',
  description: () => topic.value?.excerpt || '',
  ogTitle: () => topic.value?.title || '主题',
  ogDescription: () => topic.value?.excerpt || '',
  ogType: 'article',
})

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
            <NuxtLink v-for="tag in topic.tags" :key="tag" :to="`/tag/${encodeURIComponent(tag)}`" class="discourse-tag">{{ tag }}</NuxtLink>
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
                  <time :datetime="topic.publishedAt || topic.createdAt">{{ new Date(topic.publishedAt || topic.createdAt).toLocaleDateString('zh-CN') }}</time>
                  <span class="post-number">#1</span>
                </div>
              </div>

              <div class="cooked markdown-body" v-html="topic.contentHtml" />

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
            <tbody class="topic-list-body"><TopicRow v-for="item in relatedTopics" :key="item.id" :topic="item" /></tbody>
          </table>
        </section>
      </section>
    </div>
  </div>
</template>
