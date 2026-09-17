<script setup lang="ts">
import { computed } from 'vue'
import type { ForumTag, TopicSummary } from '~/types/forum'
import { formatDottedDate } from '../utils/date-format'

const props = defineProps<{ topic: TopicSummary; availableTags?: ForumTag[] }>()

const topicUrl = computed(() => `/t/${props.topic.id}`)
const externalHost = computed(() => {
  if (!props.topic.externalUrl) return ''
  try {
    return new URL(props.topic.externalUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
})

const activityDate = computed(() => new Date(props.topic.publishedAt || props.topic.updatedAt))
const activityLabel = computed(() => formatDottedDate(activityDate.value))
const activityTitle = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(activityDate.value))

function tagUrl(name: string): string {
  const tag = props.availableTags?.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  return `/tag/${encodeURIComponent(tag?.slug || name)}`
}
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
        <NuxtLink v-for="tag in topic.tags" :key="tag" :to="tagUrl(tag)" class="discourse-tag">
          {{ tag }}
        </NuxtLink>
        <span v-if="externalHost" class="topic-featured-link">↗ {{ externalHost }}</span>
      </div>
    </td>

    <td class="activity num topic-list-data">
      <time :datetime="activityDate.toISOString()" :title="activityTitle">{{ activityLabel }}</time>
    </td>
  </tr>
</template>
