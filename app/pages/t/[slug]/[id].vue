<script setup lang="ts">
import type { TopicDetail, TopicSummary } from '~/types/forum'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: topic, error } = await useFetch<TopicDetail>(() => `/api/topics/${id.value}`)
useCanonical(() => route.path)

if (error.value || !topic.value) {
  throw createError({ statusCode: 404, statusMessage: '主题不存在' })
}

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
  <div v-if="topic" class="reader-frame">
    <aside class="reader-context">
      <NuxtLink :to="`/c/${topic.category.slug}`" class="back-link">← {{ topic.category.name }}</NuxtLink>
      <div class="reader-index">
        <span>主题</span>
        <strong>{{ String(topic.id).padStart(3, '0') }}</strong>
      </div>
      <p>发布于 {{ new Date(topic.publishedAt || topic.createdAt).toLocaleDateString('zh-CN') }}</p>
      <p>{{ topic.viewCount }} 次浏览</p>
    </aside>

    <article class="topic-reader">
      <header class="reader-header" :style="{ '--category-color': topic.category.color }">
        <div class="reader-kicker">
          <span v-if="topic.isPinned" class="pin-badge">置顶</span>
          <NuxtLink :to="`/c/${topic.category.slug}`">{{ topic.category.name }}</NuxtLink>
          <span>更新于 {{ new Date(topic.updatedAt).toLocaleDateString('zh-CN') }}</span>
        </div>
        <h1>{{ topic.title }}</h1>
        <p>{{ topic.excerpt }}</p>
        <div class="topic-tags reader-tags">
          <NuxtLink v-for="tag in topic.tags" :key="tag" :to="`/tag/${encodeURIComponent(tag)}`" class="topic-tag">#{{ tag }}</NuxtLink>
        </div>
      </header>

      <div class="author-line">
        <span class="author-avatar">轨</span>
        <div><strong>站长</strong><small>持续整理与校正</small></div>
      </div>

      <div class="markdown-body" v-html="topic.contentHtml" />

      <a v-if="topic.externalUrl" :href="topic.externalUrl" class="tool-cta" target="_blank" rel="noopener noreferrer">
        <span><small>EXTERNAL TOOL</small><strong>访问这个工具</strong></span>
        <span aria-hidden="true">↗</span>
      </a>

      <section v-if="relatedTopics.length" class="related-topics">
        <p class="rail-label">继续阅读</p>
        <NuxtLink v-for="item in relatedTopics" :key="item.id" :to="`/t/${item.slug}/${item.id}`">
          <span>{{ item.category.name }}</span>
          <strong>{{ item.title }}</strong>
          <i aria-hidden="true">→</i>
        </NuxtLink>
      </section>
    </article>

    <aside class="reader-aside">
      <div class="reader-toc">
        <p class="rail-label">阅读提示</p>
        <p>正文支持代码、引用、列表和图片。外部链接会在新标签页打开。</p>
      </div>
    </aside>
  </div>
</template>
