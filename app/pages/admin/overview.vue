<script setup lang="ts">
import { Plus, ArrowUpRight, Files, CircleCheck, FilePenLine, FolderOpen, ArrowRight, RefreshCw } from '@lucide/vue'
import type { StudioTopic, StudioCategory } from '~/types/forum'
import { sortStudioTopics } from '~/utils/studio-topics'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '工作台概览 · 内容工作台', robots: 'noindex, nofollow' })
const { data: topics, error: topicsError, refresh: refreshTopics, status: topicStatus } = await useFetch<StudioTopic[]>('/api/studio/topics', { default: () => [] })
const { data: categories, error: categoriesError, refresh: refreshCategories, status: categoryStatus } = await useFetch<StudioCategory[]>('/api/studio/categories', { default: () => [] })
const { openNew, openEdit, revision } = useAdminComposer()
const loading = computed(() => topicStatus.value === 'pending' || categoryStatus.value === 'pending')
const loadError = computed(() => topicsError.value || categoriesError.value ? getErrorMessage(topicsError.value || categoriesError.value, '概览加载失败，请重试') : '')
const published = computed(() => topics.value.filter(topic => topic.status === 'published').length)
const recent = computed(() => sortStudioTopics(topics.value, 'updated-desc').slice(0, 6))
const distribution = computed(() => [...categories.value].sort((a, b) => b.topicCount - a.topicCount))
const maxCount = computed(() => Math.max(1, ...categories.value.map(category => category.topicCount)))
const summaryItems = computed(() => [
  { label: '全部内容', value: topics.value.length, detail: '每一次记录，都是积累' },
  { label: '已发布', value: published.value, detail: '与你的读者分享知识' },
  { label: '待完成草稿', value: topics.value.length - published.value, detail: '好想法值得继续打磨' },
  { label: '内容板块', value: categories.value.length, detail: '有序组织你的知识库' },
])
const statIcons = [Files, CircleCheck, FilePenLine, FolderOpen]
async function refresh() { await Promise.all([refreshTopics(), refreshCategories()]) }
watch(revision, refresh)
</script>

<template>
  <section class="studio-dashboard">
    <StudioPageHeader title="工作台概览" description="欢迎回来。这里是你的内容近况，开始今天的创作吧。" eyebrow="OVERVIEW">
      <button class="button button-quiet" type="button" :disabled="loading" @click="refresh"><RefreshCw :size="16" />刷新数据</button><button class="button button-primary" type="button" @click="openNew"><Plus :size="17" />新建帖子</button>
    </StudioPageHeader>
    <p v-if="loadError" class="form-alert" role="alert">{{ loadError }}</p>
    <StudioStats :items="summaryItems"><template #icon="{ index }"><component :is="statIcons[index]" :size="17" /></template></StudioStats>
    <div class="admin-overview-grid">
      <section class="admin-card">
        <header class="admin-card-heading"><div><h2>内容分布</h2><p>各个板块的积累，一目了然。</p></div><NuxtLink to="/admin/categories" class="admin-icon-button" aria-label="管理板块"><ArrowUpRight :size="18" /></NuxtLink></header>
        <div v-if="distribution.length" class="admin-distribution"><div v-for="category in distribution" :key="category.id" class="admin-distribution-row"><div><span class="admin-color-dot" :style="{ background: category.color }" /><span>{{ category.name }}</span><strong>{{ category.topicCount }} 篇</strong></div><div class="admin-bar-track"><span :style="{ width: `${category.topicCount / maxCount * 100}%`, background: category.color }" /></div><small>{{ category.publishedTopicCount }} 已发布 · {{ category.draftTopicCount }} 草稿</small></div></div>
        <StudioEmpty v-else title="还没有板块" description="新建板块，开始组织内容。" />
      </section>
      <section class="admin-card">
        <header class="admin-card-heading"><div><h2>最近编辑</h2><p>接着上次的灵感，继续往前。</p></div><NuxtLink to="/admin" class="admin-icon-button" aria-label="查看所有帖子"><ArrowUpRight :size="18" /></NuxtLink></header>
        <div v-if="recent.length" class="admin-recent-list"><button v-for="topic in recent" :key="topic.id" type="button" @click="openEdit(topic.id)"><span class="admin-recent-icon"><Files :size="18" /></span><span class="admin-recent-copy"><strong>{{ topic.title }}</strong><small>{{ topic.category.name }} · {{ topic.updatedAt.slice(0, 10) }}</small></span><span :class="['status-chip', `status-${topic.status}`]">{{ topic.status === 'published' ? '已发布' : '草稿' }}</span><ArrowRight :size="15" /></button></div>
        <StudioEmpty v-else title="从第一篇帖子开始" description="把值得记录的想法留在这里。" />
      </section>
    </div>
    <section class="admin-quickstart"><span class="admin-quickstart-icon"><FilePenLine :size="24" /></span><div><h2>下一个好想法，从这里开始。</h2><p>Markdown 编辑、实时预览、草稿恢复，让你专注内容本身。</p></div><button class="button button-quiet" type="button" @click="openNew">开始创作<ArrowRight :size="16" /></button></section>
  </section>
</template>
