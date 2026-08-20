<script setup lang="ts">
import { computed } from 'vue'
import type { TopicSummary } from '~/types/forum'

const props = defineProps<{ topic: TopicSummary }>()

const topicUrl = computed(() => `/t/${props.topic.slug}/${props.topic.id}`)
const externalHost = computed(() => {
  if (!props.topic.externalUrl) return ''
  try {
    return new URL(props.topic.externalUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
})

const compactViews = computed(() => {
  const value = props.topic.viewCount
  if (value < 1000) return String(value)
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace('.0', '')}k`
  return `${Math.round(value / 1000)}k`
})

const relativeDate = computed(() => {
  const source = props.topic.publishedAt || props.topic.updatedAt
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(source).getTime()) / 86_400_000))
  if (elapsedDays === 0) return '今天'
  if (elapsedDays === 1) return '昨天'
  if (elapsedDays < 30) return `${elapsedDays} 天前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(source))
})
</script>

<template>
  <article class="topic-row" :style="{ '--category-color': topic.category.color }">
    <span class="topic-rail" aria-hidden="true" />
    <div class="topic-main">
      <div class="topic-kicker">
        <span v-if="topic.isPinned" class="pin-badge" aria-label="置顶主题">置顶</span>
        <span class="category-label">{{ topic.category.name }}</span>
        <span v-if="externalHost" class="external-host">{{ externalHost }}</span>
      </div>
      <NuxtLink :to="topicUrl" class="topic-title" data-topic-title>
        {{ topic.title }}
      </NuxtLink>
      <p class="topic-excerpt">{{ topic.excerpt }}</p>
      <div v-if="topic.tags.length" class="topic-tags" aria-label="主题标签">
        <NuxtLink v-for="tag in topic.tags" :key="tag" :to="`/tag/${encodeURIComponent(tag)}`" class="topic-tag">
          #{{ tag }}
        </NuxtLink>
      </div>
    </div>
    <div class="topic-stats" aria-label="主题统计">
      <span><strong>{{ compactViews }}</strong> 浏览</span>
      <time :datetime="topic.updatedAt">{{ relativeDate }}</time>
    </div>
  </article>
</template>
