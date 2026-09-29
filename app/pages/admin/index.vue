<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, Files, CircleCheck, FilePenLine, Eye, Pin, RefreshCw } from '@lucide/vue'
import type { StudioTopic } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'
import { sortStudioTopics, STUDIO_TOPIC_SORT_OPTIONS, type StudioTopicSort } from '~/utils/studio-topics'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '帖子管理 · 内容工作台', robots: 'noindex, nofollow' })

const route = useRoute()
const filter = ref<'all' | 'published' | 'draft'>('all')
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const category = ref('')
const sort = ref<StudioTopicSort>('updated-desc')
const actionError = ref('')
const deleting = ref<number | null>(null)
const { data: topics, refresh, status, error } = await useFetch<StudioTopic[]>('/api/studio/topics', { default: () => [] })
const { openEdit, openNew, revision } = useAdminComposer()
watch(revision, () => refresh())
watch(() => route.query.q, value => { query.value = typeof value === 'string' ? value : '' })
const categories = computed(() => [...new Map(topics.value.map(topic => [topic.category.slug, topic.category])).values()])
const publishedCount = computed(() => topics.value.filter(topic => topic.status === 'published').length)
const summaryItems = computed(() => [
  { label: '全部帖子', value: topics.value.length, detail: '知识库中的全部内容' },
  { label: '已发布', value: publishedCount.value, detail: '已对公共网站开放' },
  { label: '草稿', value: topics.value.length - publishedCount.value, detail: '继续打磨，随时发布' },
  { label: '帖子浏览量', value: topics.value.reduce((sum, topic) => sum + topic.viewCount, 0), detail: '所有帖子的累计浏览量' },
])
const statIcons = [Files, CircleCheck, FilePenLine, Eye]
const visibleTopics = computed(() => sortStudioTopics(topics.value.filter(topic =>
  (filter.value === 'all' || topic.status === filter.value)
  && (!category.value || topic.category.slug === category.value)
  && (!query.value.trim() || topic.title.toLowerCase().includes(query.value.trim().toLowerCase())),
), sort.value))
const { page, pageSize, pagedItems } = useStudioPagination(visibleTopics)
watch([filter, query, category, sort], () => { page.value = 1 })
const loadError = computed(() => error.value ? getErrorMessage(error.value, '帖子加载失败，请重试') : '')

function formatStudioDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function removeTopic(topic: StudioTopic) {
  if (deleting.value !== null || !confirm(`确定删除“${topic.title}”吗？这个操作不能撤销。`)) return
  deleting.value = topic.id
  actionError.value = ''
  try {
    await $fetch(`/api/studio/topics/${topic.id}`, { method: 'DELETE' })
    await refresh()
  } catch (error) { actionError.value = getErrorMessage(error, '删除失败，请稍后重试') }
  finally { deleting.value = null }
}
</script>

<template>
  <section class="studio-dashboard">
    <StudioPageHeader title="帖子管理" description="在这里整理想法，管理草稿，让值得分享的知识被看见。" eyebrow="CONTENT">
      <button class="button button-quiet" type="button" :disabled="status === 'pending'" @click="refresh()"><RefreshCw :size="16" />刷新</button>
      <button class="button button-primary" type="button" @click="openNew"><Plus :size="17" />新建帖子</button>
    </StudioPageHeader>
    <StudioStats :items="summaryItems"><template #icon="{ index }"><component :is="statIcons[index]" :size="17" /></template></StudioStats>
    <p v-if="actionError || loadError" class="form-alert" role="alert">{{ actionError || loadError }} <button v-if="loadError" type="button" @click="refresh()">重新加载</button></p>
    <div class="admin-section-heading"><h2>所有内容 <span class="admin-count">{{ topics.length }}</span></h2><span>管理你的知识资产</span></div>
    <div class="studio-toolbar">
      <div class="filter-tabs" aria-label="帖子状态筛选">
        <button v-for="item in [{ key: 'all', label: '全部' }, { key: 'published', label: '已发布' }, { key: 'draft', label: '草稿' }]" :key="item.key" type="button" :aria-pressed="filter === item.key" :class="{ 'is-active': filter === item.key }" @click="filter = item.key as typeof filter">{{ item.label }}</button>
      </div>
      <div class="studio-toolbar__controls">
        <label class="admin-search-field"><Search :size="16" /><input v-model="query" type="search" placeholder="搜索标题" aria-label="搜索标题"></label>
        <label class="studio-sort-control"><span class="sr-only">按板块筛选</span><select v-model="category" aria-label="按板块筛选"><option value="">所有板块</option><option v-for="item in categories" :key="item.slug" :value="item.slug">{{ item.name }}</option></select></label>
        <label class="studio-sort-control"><span class="sr-only">排序方式</span><select v-model="sort" aria-label="排序方式"><option v-for="option in STUDIO_TOPIC_SORT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>
    </div>
    <div class="studio-table-wrap" :aria-busy="status === 'pending'">
      <table class="studio-table topic-management-table">
        <thead><tr><th>主题</th><th>板块</th><th>状态</th><th>浏览</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="topic in pagedItems" :key="topic.id">
            <td><div class="admin-topic-title"><Pin v-if="topic.isPinned" :size="14" aria-label="置顶" /><strong>{{ topic.title }}</strong></div><small>{{ topic.excerpt || '暂无摘要' }}</small></td>
            <td><span class="category-chip" :style="{ '--category-color': topic.category.color }">{{ topic.category.name }}</span></td>
            <td><span :class="['status-chip', `status-${topic.status}`]"><span class="status-dot" />{{ topic.status === 'published' ? '已发布' : '草稿' }}</span></td>
            <td class="admin-numeric">{{ topic.viewCount.toLocaleString('zh-CN') }}</td>
            <td class="studio-topic-time"><time v-if="topic.publishedAt" :datetime="topic.publishedAt">{{ formatStudioDate(topic.publishedAt) }}</time><span v-else class="studio-topic-time__unpublished">未发布</span><small>修改 {{ formatStudioDate(topic.updatedAt) }}</small></td>
            <td class="row-actions">
              <button type="button" :aria-label="`编辑帖子：${topic.title}`" title="编辑帖子" @click="openEdit(topic.id)"><Pencil :size="14" /><span>编辑</span></button>
              <button type="button" :disabled="deleting !== null" @click="removeTopic(topic)"><Trash2 :size="14" /><span>{{ deleting === topic.id ? '删除中' : '删除' }}</span></button>
            </td>
          </tr>
        </tbody>
      </table>
      <StudioEmpty v-if="!visibleTopics.length && !loadError" :title="status === 'pending' ? '正在加载帖子…' : '没有匹配的主题'" description="调整筛选条件，或从一个新想法开始。" />
    </div>
    <StudioPagination v-model:page="page" :total="visibleTopics.length" :page-size="pageSize" label="帖子管理分页" />
  </section>
</template>
