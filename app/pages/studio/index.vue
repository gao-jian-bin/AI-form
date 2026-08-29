<script setup lang="ts">
import type { StudioTopic } from '~/types/forum'
import {
  sortStudioTopics,
  STUDIO_TOPIC_SORT_OPTIONS,
  type StudioTopicSort,
} from '~/utils/studio-topics'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '内容工作台', robots: 'noindex, nofollow' })

const filter = ref<'all' | 'published' | 'draft'>('all')
const query = ref('')
const sort = ref<StudioTopicSort>('updated-desc')
const { data: topics, refresh } = await useFetch<StudioTopic[]>('/api/studio/topics', { default: () => [] })
const { openEdit, openNew, revision } = useAdminComposer()
watch(revision, () => refresh())
const visibleTopics = computed(() => sortStudioTopics(
  topics.value.filter((topic) => {
    const matchesStatus = filter.value === 'all' || topic.status === filter.value
    const matchesQuery = !query.value.trim() || topic.title.toLowerCase().includes(query.value.trim().toLowerCase())
    return matchesStatus && matchesQuery
  }),
  sort.value,
))

function formatStudioDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function removeTopic(topic: StudioTopic) {
  if (!confirm(`确定删除“${topic.title}”吗？这个操作不能撤销。`)) return
  await $fetch(`/api/studio/topics/${topic.id}`, { method: 'DELETE' })
  await refresh()
}

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/studio/sign-in')
}
</script>

<template>
  <section class="studio-dashboard">
    <header class="dashboard-heading">
      <div>
        <p class="stream-eyebrow">PUBLISHING DESK</p>
        <h1>帖子管理</h1>
        <p>创建、修改和整理公共论坛中的内容。</p>
      </div>
      <div class="dashboard-actions">
        <button class="button button-quiet" type="button" @click="signOut">退出</button>
        <button class="button button-primary" type="button" @click="openNew">＋ 新建帖子</button>
      </div>
    </header>

    <div class="studio-toolbar">
      <div class="filter-tabs">
        <button v-for="item in [{ key: 'all', label: '全部' }, { key: 'published', label: '已发布' }, { key: 'draft', label: '草稿' }]" :key="item.key" type="button" :class="{ 'is-active': filter === item.key }" @click="filter = item.key as typeof filter">
          {{ item.label }}
        </button>
      </div>
      <div class="studio-toolbar__controls">
        <label class="studio-sort-control">
          <span class="sr-only">排序方式</span>
          <select v-model="sort" aria-label="排序方式">
            <option v-for="option in STUDIO_TOPIC_SORT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <input v-model="query" type="search" placeholder="搜索标题">
      </div>
    </div>

    <div class="studio-table-wrap">
      <table class="studio-table topic-management-table">
        <thead><tr><th>主题</th><th>板块</th><th>状态</th><th>浏览</th><th>时间</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          <tr v-for="topic in visibleTopics" :key="topic.id">
            <td><strong>{{ topic.title }}</strong><small>{{ topic.excerpt }}</small></td>
            <td><span class="category-chip" :style="{ '--category-color': topic.category.color }">{{ topic.category.name }}</span></td>
            <td><span :class="['status-chip', `status-${topic.status}`]">{{ topic.status === 'published' ? '已发布' : '草稿' }}</span></td>
            <td>{{ topic.viewCount }}</td>
            <td class="studio-topic-time">
              <time v-if="topic.publishedAt" :datetime="topic.publishedAt">{{ formatStudioDate(topic.publishedAt) }}</time>
              <span v-else class="studio-topic-time__unpublished">未发布</span>
              <small>修改 {{ formatStudioDate(topic.updatedAt) }}</small>
            </td>
            <td class="row-actions">
              <button type="button" :aria-label="`编辑帖子：${topic.title}`" title="编辑帖子" @click="openEdit(topic.id)">
                <svg class="row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                  <path d="m13.5 6.5 4 4" />
                </svg>
                <span>编辑</span>
              </button>
              <button type="button" @click="removeTopic(topic)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!visibleTopics.length" class="state-panel"><strong>没有匹配的主题</strong><p>调整筛选条件或创建一个新主题。</p></div>
    </div>
  </section>
</template>
