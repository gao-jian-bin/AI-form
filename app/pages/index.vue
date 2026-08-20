<script setup lang="ts">
import type { ForumCategory, TopicSummary } from '~/types/forum'

const { data: categories } = await useFetch<ForumCategory[]>('/api/categories', { default: () => [] })
const { data: topics, status, error, refresh } = await useFetch<TopicSummary[]>('/api/topics', { default: () => [] })
useCanonical(() => '/')

useSeoMeta({
  title: '最新主题',
  description: '持续收录 ChatGPT 技巧、AI 学习框架与实用在线工具。',
})
</script>

<template>
  <ForumPage
    title="最新主题"
    description="按发布时间整理的全部知识条目。置顶内容适合第一次来时先读。"
    :topics="topics"
    :categories="categories"
    :pending="status === 'pending'"
    :error-message="error?.statusMessage"
    @retry="refresh"
  />
</template>
