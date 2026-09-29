<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, FolderOpen, Files, CircleCheck, FilePenLine, RefreshCw } from '@lucide/vue'
import type { StudioCategory } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '板块管理 · 内容工作台', robots: 'noindex, nofollow' })
const query = ref('')
const errorMessage = ref('')
const deleting = ref<number | null>(null)
const { data: categories, refresh, status, error } = await useFetch<StudioCategory[]>('/api/studio/categories', { default: () => [] })
const loadError = computed(() => error.value ? getErrorMessage(error.value, '板块加载失败，请重试') : '')
const visibleCategories = computed(() => categories.value.filter(item => `${item.name} ${item.slug} ${item.description}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const { page, pageSize, pagedItems } = useStudioPagination(visibleCategories)
watch(query, () => { page.value = 1 })
const summaryItems = computed(() => [
  { label: '内容板块', value: categories.value.length, detail: '让知识各归其位' },
  { label: '帖子总数', value: categories.value.reduce((sum, item) => sum + item.topicCount, 0), detail: '所有板块的内容积累' },
  { label: '已发布帖子', value: categories.value.reduce((sum, item) => sum + item.publishedTopicCount, 0), detail: '公开网站中可见的内容' },
  { label: '草稿帖子', value: categories.value.reduce((sum, item) => sum + item.draftTopicCount, 0), detail: '尚未发布的想法' },
])
const statIcons = [FolderOpen, Files, CircleCheck, FilePenLine]
async function removeCategory(category: StudioCategory) {
  if (deleting.value !== null || !confirm(`确定删除“${category.name}”吗？`)) return
  errorMessage.value = ''
  deleting.value = category.id
  try { await $fetch(`/api/studio/categories/${category.id}`, { method: 'DELETE' }); await refresh() }
  catch (error) { errorMessage.value = getErrorMessage(error, '删除失败，请稍后重试') }
  finally { deleting.value = null }
}
</script>

<template>
  <section class="studio-dashboard">
    <StudioPageHeader title="板块管理" description="为内容建立清晰的目录，管理分类、识别色与展示顺序。" eyebrow="CATEGORIES">
      <NuxtLink to="/admin/categories/new" class="button button-primary"><Plus :size="17" />新建板块</NuxtLink>
    </StudioPageHeader>
    <StudioStats :items="summaryItems"><template #icon="{ index }"><component :is="statIcons[index]" :size="17" /></template></StudioStats>
    <p v-if="errorMessage || loadError" class="form-alert" role="alert">{{ errorMessage || loadError }} <button v-if="loadError" type="button" @click="refresh()">重新加载</button></p>
    <div class="studio-toolbar"><label class="admin-search-field"><Search :size="16" /><input v-model="query" type="search" placeholder="搜索板块名称或标识" aria-label="搜索板块"></label><button class="button button-quiet" type="button" :disabled="status === 'pending'" @click="refresh()"><RefreshCw :size="15" />刷新</button></div>
    <div class="studio-table-wrap" :aria-busy="status === 'pending'">
      <table class="studio-table category-table">
        <thead><tr><th>板块</th><th>网址标识</th><th>识别色</th><th>顺序</th><th>帖子</th><th>操作</th></tr></thead>
        <tbody><tr v-for="category in pagedItems" :key="category.id">
          <td><div class="admin-category-name"><span class="admin-category-icon" :style="{ '--category-color': category.color }"><FolderOpen :size="19" /></span><div><strong>{{ category.name }}</strong><small>{{ category.description || '暂无说明' }}</small></div></div></td>
          <td><code class="admin-code">{{ category.slug }}</code></td>
          <td><span class="category-chip" :style="{ '--category-color': category.color }">{{ category.color }}</span></td>
          <td class="admin-numeric">{{ category.position }}</td>
          <td><strong class="category-topic-total">{{ category.topicCount }}</strong><small>{{ category.publishedTopicCount }} 已发布 · {{ category.draftTopicCount }} 草稿</small></td>
          <td class="row-actions"><NuxtLink :to="`/admin/categories/${category.id}/edit`"><Pencil :size="14" />编辑</NuxtLink><button type="button" :disabled="deleting !== null" @click="removeCategory(category)"><Trash2 :size="14" />删除</button></td>
        </tr></tbody>
      </table>
      <StudioEmpty v-if="!visibleCategories.length && !loadError" :title="status === 'pending' ? '正在加载板块…' : '没有匹配的板块'" description="清空搜索条件，或创建你的第一个内容板块。" />
    </div>
    <StudioPagination v-model:page="page" :total="visibleCategories.length" :page-size="pageSize" label="板块分页" />
    <p class="admin-hint">板块中还有帖子时，请先移动或删除帖子。网址标识创建后保持不变，已分享的链接不会失效。</p>
  </section>
</template>
