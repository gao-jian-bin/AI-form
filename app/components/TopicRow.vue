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

const activityDate = computed(() => new Date(props.topic.publishedAt || props.topic.updatedAt))
const activityLabel = computed(() => {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - activityDate.value.getTime()) / 60_000))
  if (elapsedMinutes < 1) return '刚刚'
  if (elapsedMinutes < 60) return `${elapsedMinutes} 分钟`
  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `${hours} 小时`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天`
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(activityDate.value)
})
const activityTitle = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(activityDate.value))
</script>

<template>
  <tr class="topic-list-item" :class="{ pinned: topic.isPinned }" :data-topic-id="topic.id">
    <td class="main-link topic-list-data">
      <span class="link-top-line" role="heading" aria-level="2">
        <svg v-if="topic.isPinned" class="topic-status-icon" viewBox="0 0 24 24" aria-label="置顶主题">
          <path d="m15 4 5 5-3 1-4 4-1 5-2-2-5 5-2-2 5-5-2-2 5-1 4-4 1-3Z" />
        </svg>
        <NuxtLink :to="topicUrl" class="title raw-topic-link" data-topic-title>
          {{ topic.title }}
        </NuxtLink>
      </span>

      <div class="link-bottom-line">
        <NuxtLink :to="`/c/${topic.category.slug}`" class="badge-category">
          <span class="badge-category__bullet" :style="{ backgroundColor: topic.category.color }" />
          <span class="badge-category__name">{{ topic.category.name }}</span>
        </NuxtLink>
        <NuxtLink v-for="tag in topic.tags" :key="tag" :to="`/tag/${encodeURIComponent(tag)}`" class="discourse-tag">
          {{ tag }}
        </NuxtLink>
        <span v-if="externalHost" class="topic-featured-link">↗ {{ externalHost }}</span>
      </div>
    </td>

    <td class="num views topic-list-data">
      <span class="number">{{ compactViews }}</span>
      <span class="mobile-stat-label">浏览</span>
    </td>

    <td class="activity num topic-list-data">
      <time :datetime="activityDate.toISOString()" :title="activityTitle">{{ activityLabel }}</time>
    </td>
  </tr>
</template>
