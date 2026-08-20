<script setup lang="ts">
import type { ForumCategory, TopicSummary } from '~/types/forum'

const props = defineProps<{
  title: string
  description: string
  topics: TopicSummary[]
  categories: ForumCategory[]
  pending?: boolean
  errorMessage?: string
  activeCategory?: string
  eyebrow?: string
}>()

const emit = defineEmits<{ retry: [] }>()
const hotTopics = computed(() => [...props.topics].sort((a, b) => b.viewCount - a.viewCount))
</script>

<template>
  <div class="forum-frame">
    <ForumSidebar :categories="categories" :active-category="activeCategory" />

    <section class="topic-stream" aria-labelledby="stream-title">
      <header class="stream-header">
        <div>
          <p class="stream-eyebrow">{{ eyebrow || 'KNOWLEDGE STREAM' }}</p>
          <h1 id="stream-title">{{ title }}</h1>
          <p>{{ description }}</p>
        </div>
        <span class="topic-total">{{ topics.length }} 个主题</span>
      </header>

      <div class="stream-columns" aria-hidden="true">
        <span>主题</span>
        <span>活跃</span>
      </div>

      <div v-if="pending" class="topic-skeletons" aria-label="正在加载主题">
        <div v-for="index in 5" :key="index" class="topic-skeleton" />
      </div>

      <div v-else-if="errorMessage" class="state-panel" role="alert">
        <strong>暂时无法加载主题</strong>
        <p>{{ errorMessage }}</p>
        <button class="button button-primary" type="button" @click="emit('retry')">重新加载</button>
      </div>

      <div v-else-if="!topics.length" class="state-panel">
        <strong>这里暂时没有主题</strong>
        <p>换个关键词，或去其他板块看看。</p>
        <NuxtLink to="/" class="button button-primary">返回最新主题</NuxtLink>
      </div>

      <div v-else class="topic-list">
        <TopicRow v-for="topic in topics" :key="topic.id" :topic="topic" />
      </div>
    </section>

    <ForumAside :hot-topics="hotTopics" />
  </div>
</template>
